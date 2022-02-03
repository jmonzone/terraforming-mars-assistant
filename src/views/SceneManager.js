// import World, { Body, Box, Vec3 } from 'cannon';
import * as CANNON from 'cannon';

import React, { forwardRef, useEffect, useRef, useState } from 'react';
import { TextureLoader, DirectionalLight, MeshStandardMaterial, Vector3, Vector2, BoxGeometry, Mesh, PerspectiveCamera, WebGLRenderer, Scene } from 'three';
import { getRandomRange } from './Utility';

const CubeTypes = {
  bronze: { color: '#b75423', size: 0.2 },
  silver: { color: '#bdbdbd', size: 0.25 },
  gold: { color: '#ea9a1a', size: 0.3 },
};

function SceneManager({ resources }, { current: cubeContainers }) {
  const canvas = useRef();

  const initialCubes = {};
  Object.keys(resources).forEach((resource) => {
    initialCubes[resource] = {};
    Object.keys(CubeTypes).forEach((type) => { initialCubes[resource][type] = []; });
  });

  const [cubes, setCubes] = useState(initialCubes);
  const [sceneInfo, setSceneInfo] = useState();


  const screenToWorldPoint = (x, y) => {
    const { clientWidth, clientHeight } = canvas.current;
    const { camera } = sceneInfo;

    const screenPosition = new Vector2();
    screenPosition.x = x / clientWidth * 2 - 1;
    screenPosition.y = -(y / clientHeight) * 2 + 1;

    const projection = new Vector3(screenPosition.x, screenPosition.y, 10);
    projection.unproject(camera);

    const direction = projection.sub(camera.position).normalize();
    const distance = -camera.position.z / direction.z;

    const targetPosition = camera.position.clone().add(direction.multiplyScalar(distance));
    return targetPosition;
  };

  const createCube = (type, container) => {
    // calculates random position inside resource container
    const { left, top, width, height } = container.getBoundingClientRect();
    const x = left - 10 + width / 2;
    const y = top - 10 + height / 2;

    const centerPosition = screenToWorldPoint(x, y);
    const randomOffset = new Vector3(getRandomRange(-1, 1), getRandomRange(-0.5, 0.5), 0.5);
    const targetPosition = centerPosition.add(randomOffset);

    // creates mesh renderer
    const { scene, world, envMap } = sceneInfo;
    const { color, size } = CubeTypes[type];
    const geometry = new BoxGeometry(size, size, size);
    const material = new MeshStandardMaterial({ color, envMap, roughness: 0.3, metalness: 1 });
    material.needsUpdate = true;

    const cube = new Mesh(geometry, material);
    cube.position.copy(targetPosition);
    cube.quaternion.random();

    // adding physics body
    const shape = new CANNON.Box(new CANNON.Vec3(size / 2, size / 2, size / 2));
    const body = new CANNON.Body({ mass: 5, shape });
    body.position.copy(targetPosition);
    body.quaternion.copy(cube.quaternion);
    cube.body = body;

    // adding initial cube force (simulates a dice roll motion)
    const force = new CANNON.Vec3(getRandomRange(-600, 600), getRandomRange(-600, 600), 0);
    body.applyForce(force, body.position);

    // adding cube to scene and world
    scene.add(cube);
    world.addBody(body);

    return cube;
  };

  const removeCube = (resource, type) => {
    const lastIndex = cubes[resource][type].length - 1;
    const cube = cubes[resource][type][lastIndex];
    sceneInfo.world.remove(cube.body);
    sceneInfo.scene.remove(cube);
  };

  useEffect(() => {
    const { clientWidth, clientHeight } = canvas.current;

    const scene = new Scene();
    const camera = new PerspectiveCamera(50, clientWidth / clientHeight, 0.1, 1000);
    camera.position.z = 10;

    const renderer = new WebGLRenderer({ alpha: true });
    renderer.setSize(clientWidth, clientHeight);
    canvas.current.appendChild(renderer.domElement);

    const leftLight = new DirectionalLight(0xffffff, 10);
    leftLight.position.set(10, 10, 0);
    scene.add(leftLight);

    const rightLight = new DirectionalLight(0xffffff, 10);
    rightLight.position.set(-10, 10, 0);
    scene.add(rightLight);

    const textureLoader = new TextureLoader();
    const envMap = textureLoader.load('assets/images/envmap.jpg');

    // create cannon.js physics world
    const world = new CANNON.World();
    world.gravity = new CANNON.Vec3(0, 0, -9.82);

    // creates physics body representing the floor/player mat
    const groundSize = 500;
    const groundShape = new CANNON.Box(new CANNON.Vec3(groundSize / 2, groundSize / 2, 0.1));
    const groundBody = new CANNON.Body({ mass: 0, shape: groundShape });
    world.addBody(groundBody);

    const animate = () => {
      // sync cube renderers with their physics bodies
      Object.keys(cubes).forEach((resource) => {
        Object.keys(cubes[resource]).forEach((cubeType) => {
          cubes[resource][cubeType].forEach((cube) => {
            cube.position.copy(cube.body.position);
            cube.quaternion.copy(cube.body.quaternion);
          });
        });
      });

      renderer.render(scene, camera);
      world.step(1 / 60);

      requestAnimationFrame(animate);
    };

    animate();


    // update container positions on window resize
    const resize = () => {
      const { clientWidth: width, clientHeight: height } = canvas.current;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
    };

    window.addEventListener('resize', resize);

    setSceneInfo({ scene, camera, envMap, world });

    return () => {
      canvas.current.removeChild(renderer.domElement);
      window.removeEventListener('resize', resize);
    };
  }, []);

  useEffect(() => {
    if (!sceneInfo) return;
    const { scene, world } = sceneInfo;

    const addLights = () => {
      cubeContainers.forEach((container) => {
        const { left, top, width, height } = container.getBoundingClientRect();
        const x = left - 10 + width / 2;
        const y = top - 10 + height / 2;

        const light = new DirectionalLight(0xffffff, 0.05);

        const targetPosition = screenToWorldPoint(x, y);
        light.position.set(targetPosition.x, targetPosition.y, 10);
        scene.add(light);
      });
    };

    const updateCollider = (collider, container, side, size) => {
      const { left, top, right, bottom, width: w, height: h } = container.getBoundingClientRect();

      const centerX = left - 10 + w / 2;
      const centerY = top - 10 + h / 2;

      const colliderPositions = {
        top: {
          position: new Vector2(centerX, top - 10),
          rotation: new CANNON.Vec3(1, 0, 0),
        },
        left: {
          position: new Vector2(left - 10, centerY),
          rotation: new CANNON.Vec3(0, 1, 0),
        },
        right: {
          position: new Vector2(right - 10, centerY),
          rotation: new CANNON.Vec3(0, 1, 0),
        },
        bottom: {
          position: new Vector2(centerX, bottom - 10),
          rotation: new CANNON.Vec3(1, 0, 0),
        },
      };

      const euler = new CANNON.Vec3();
      colliderPositions[side].rotation.scale(Math.PI / 2, euler);
      collider.quaternion.setFromEuler(euler.x, euler.y, euler.z);


      const { x, y } = colliderPositions[side].position;
      const targetPosition = screenToWorldPoint(x, y);
      collider.position.set(targetPosition.x, targetPosition.y, size / 2);
    };

    // add 4 wall colliders for each resource to keep the cubes in place
    const addContainerColliders = () => {
      const sides = ['top', 'left', 'right', 'bottom'];

      cubeContainers.forEach((cubeContainer) => {
        sides.forEach((side) => {
          const size = 5;

          const shape = new CANNON.Box(new CANNON.Vec3(size / 2, size / 2, 0.005));
          const collider = new CANNON.Body({ mass: 0, shape });

          updateCollider(collider, cubeContainer, side, size);
          world.addBody(collider);
        });
      });
    };

    addLights();
    addContainerColliders();
  }, [sceneInfo]);


  const createCubes = () => {
    if (!sceneInfo) return;
    const newCubes = cubes;

    cubeContainers.forEach((cubeContainer, index) => {
      const resourceType = Object.keys(resources)[index];
      const resourcesRequired = resources[resourceType].resource;

      // breaks down the number of each cubes needed to reach the value of resources required
      const cubesRequired = {
        bronze: resourcesRequired % 5,
        silver: Math.floor((resourcesRequired % 10) / 5),
        gold: Math.floor(resourcesRequired / 10),
      };

      // creates/removes cube objects for each cube type
      Object.keys(cubesRequired).forEach((cubeType) => {
        const currentCubeAmount = cubes[resourceType][cubeType].length;

        // add cubes if there aren't enough
        for (let i = currentCubeAmount; i < cubesRequired[cubeType]; i += 1) {
          const cube = createCube(cubeType, cubeContainer);
          newCubes[resourceType][cubeType].push(cube);
        }

        // removes cubes if there are too much
        for (let i = currentCubeAmount; i > cubesRequired[cubeType]; i -= 1) {
          removeCube(resourceType, cubeType);
          newCubes[resourceType][cubeType].pop();
        }
      });
    });

    setCubes(newCubes);
  };

  // update cubes when resources are updated
  useEffect(createCubes, [resources]);

  return (
    <div className="scene" ref={canvas} />
  );
}

const forwardedRef = forwardRef(SceneManager);

export default forwardedRef;
