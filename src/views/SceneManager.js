// import World, { Body, Box, Vec3 } from 'cannon';
import * as CANNON from 'cannon';

import React, { forwardRef, useEffect, useRef, useState } from 'react';
import { MeshBasicMaterial, PlaneGeometry, TextureLoader, DirectionalLight, MeshStandardMaterial, Vector3, Vector2, BoxGeometry, Mesh, PerspectiveCamera, WebGLRenderer, Scene, DoubleSide } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

function SceneManager({ resources }, { current: cubeContainers }) {
  const cubeTypes = {
    bronze: { color: '#b75423', size: 0.2 },
    silver: { color: '#bdbdbd', size: 0.25 },
    gold: { color: '#ea9a1a', size: 0.3 },
  };
  const initialCubes = {};
  Object.keys(resources).forEach((resource) => {
    initialCubes[resource] = {};
    Object.keys(cubeTypes).forEach((type) => { initialCubes[resource][type] = []; });
  });

  const canvas = useRef();
  const [sceneInfo, setSceneInfo] = useState();
  const [cubes, setCubes] = useState(initialCubes);

  const screenToWorldPoint = (x, y, camera) => {
    const { clientWidth: width, clientHeight: height } = canvas.current;

    const screenPosition = new Vector2();
    screenPosition.x = x / width * 2 - 1;
    screenPosition.y = -(y / height) * 2 + 1;

    const projection = new Vector3(screenPosition.x, screenPosition.y, 10);
    projection.unproject(camera);
    const direction = projection.sub(camera.position).normalize();
    const distance = -camera.position.z / direction.z;
    const targetPosition = camera.position.clone().add(direction.multiplyScalar(distance));
    return targetPosition;
  };

  const createCube = (type, x, y) => {
    const { color, size } = cubeTypes[type];

    const { scene, camera, width, height, world } = sceneInfo;
    const geometry = new BoxGeometry(size, size, size);
    const material = new MeshStandardMaterial({ color, envMap: sceneInfo.envMap, roughness: 0.3, metalness: 1 });
    material.needsUpdate = true;

    const cube = new Mesh(geometry, material);
    scene.add(cube);

    const screenPosition = new Vector2();
    screenPosition.x = x / width * 2 - 1;
    screenPosition.y = -(y / height) * 2 + 1;

    const projection = new Vector3(screenPosition.x, screenPosition.y, 10);
    projection.unproject(camera);
    const direction = projection.sub(camera.position).normalize();
    const distance = -camera.position.z / direction.z;
    const centerPosition = camera.position.clone().add(direction.multiplyScalar(distance));

    // add to utility page
    const sign = () => (Math.random() < 0.5 ? -1 : 1);

    const targetPosition = centerPosition.add(new Vector3(Math.random() * sign(), Math.random() * 0.5 * sign(), 0.5));
    cube.position.copy(targetPosition);
    cube.quaternion.random();


    // adding cube physics
    const shape = new CANNON.Box(new CANNON.Vec3(size / 2, size / 2, size / 2));
    const body = new CANNON.Body({ mass: 5, shape });
    body.position.set(targetPosition.x, targetPosition.y, targetPosition.z);
    body.quaternion.set(cube.quaternion.x, cube.quaternion.y, cube.quaternion.z, cube.quaternion.w);

    const randomDir = () => (Math.random() * 250 + 300) * sign();
    body.applyForce(new CANNON.Vec3(randomDir(), randomDir(), 0), body.position);
    world.addBody(body);
    cube.body = body;


    return cube;
  };

  const removeCube = (resource, type) => {
    const lastIndex = cubes[resource][type].length - 1;
    const cube = cubes[resource][type][lastIndex];
    sceneInfo.world.remove(cube.body);
    sceneInfo.scene.remove(cube);
  };

  useEffect(() => {
    console.log('creating scene');
    const { clientWidth: width, clientHeight: height } = canvas.current;

    const scene = new Scene();
    const camera = new PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.z = 10;

    const renderer = new WebGLRenderer({ alpha: true });
    renderer.setSize(width, height);
    canvas.current.appendChild(renderer.domElement);

    const addLights = () => {
      cubeContainers.forEach((container) => {
        const { left, top, width: w, height: h } = container.getBoundingClientRect();
        const x = left - 10 + w / 2;
        const y = top - 10 + h / 2;

        const screenPosition = new Vector2();
        screenPosition.x = x / width * 2 - 1;
        screenPosition.y = -(y / height) * 2 + 1;

        const projection = new Vector3(screenPosition.x, screenPosition.y, 10);
        projection.unproject(camera);
        const direction = projection.sub(camera.position).normalize();
        const distance = -camera.position.z / direction.z;
        const centerPosition = camera.position.clone().add(direction.multiplyScalar(distance));

        const light = new DirectionalLight(0xffffff, 0.05);
        light.position.set(centerPosition.x, centerPosition.y, 10);
        scene.add(light);
      });
    };

    const light = new DirectionalLight(0xffffff, 10);
    light.position.set(10, 10, 0);
    scene.add(light);

    const light2 = new DirectionalLight(0xffffff, 10);
    light2.position.set(-10, 10, 0);
    scene.add(light2);

    const textureLoader = new TextureLoader();
    const envMap = textureLoader.load('assets/images/envmap.jpg');

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target = new Vector3(0, 0, 0);


    // set up cannon physics world
    const world = new CANNON.World();
    world.gravity = new CANNON.Vec3(0, 0, -9.82);

    const groundSize = 100;
    const groundShape = new CANNON.Box(new CANNON.Vec3(groundSize / 2, groundSize / 2, 0.1));
    const groundBody = new CANNON.Body({ mass: 0, shape: groundShape });
    world.addBody(groundBody);

    const groundGeometry = new PlaneGeometry(groundSize, groundSize);
    const groundMaterial = new MeshBasicMaterial({ color: '#ff0', side: DoubleSide, transparent: true, opacity: 0.25 });

    const groundPlane = new Mesh(groundGeometry, groundMaterial);
    groundPlane.position.copy(groundBody.position);
    groundPlane.quaternion.copy(groundBody.quaternion);
    // scene.add(groundPlane);

    const containerBodies = [];

    const updateCubeContainerPositions = ({ containerElement, containerBody, size, wall }) => {
      const { left, top, right, bottom, width: w, height: h } = containerElement.getBoundingClientRect();

      const centerX = left - 10 + w / 2;
      const centerY = top - 10 + h / 2;

      const containerWallTransforms = {
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
      containerWallTransforms[wall].rotation.scale(Math.PI / 2, euler);
      containerBody.quaternion.setFromEuler(euler.x, euler.y, euler.z);


      const { x, y } = containerWallTransforms[wall].position;
      const targetPosition = screenToWorldPoint(x, y, camera);
      containerBody.position.set(targetPosition.x, targetPosition.y, size / 2);
    };

    const containerWallTypes = ['top', 'left', 'right', 'bottom'];

    const addCubeContainers = () => {
      cubeContainers.forEach((cubeContainer) => {
        containerWallTypes.forEach((wall) => {
          const size = 3;

          const containerShape = new CANNON.Box(new CANNON.Vec3(size / 2, size / 2, 0.005));
          const containerBody = new CANNON.Body({ mass: 0, shape: containerShape });

          const args = { containerElement: cubeContainer, containerBody, size, wall };
          updateCubeContainerPositions(args);
          containerBodies.push(args);

          // three js visuals
          // const geometry = new BoxGeometry(size, size, 0.01);
          // const material = new MeshBasicMaterial({ color: '#f00', side: DoubleSide, transparent: true, opacity: 0.25 });

          // const plane = new Mesh(geometry, material);
          // plane.position.copy(containerBody.position);
          // plane.quaternion.copy(containerBody.quaternion);
          // scene.add(plane);

          world.addBody(containerBody);
        });
      });
    };

    const animate = () => {
      requestAnimationFrame(animate);
      world.step(1 / 60);

      controls.update();
      Object.keys(cubes).forEach((resource) => {
        Object.keys(cubes[resource]).forEach((cubeType) => {
          cubes[resource][cubeType].forEach((cube) => {
            // if (Vector3.distance(cube.position, cube.body.position) > 0.01) {
            cube.position.copy(cube.body.position);
            cube.quaternion.copy(cube.body.quaternion);
            // }
          });
        });
      });
      renderer.render(scene, camera);
    };

    animate();


    // update container positions
    const resize = () => {
      const { clientWidth, clientHeight } = canvas.current;

      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();

      renderer.setSize(clientWidth, clientHeight);

      containerBodies.forEach(updateCubeContainerPositions);
    };

    window.addEventListener('load', addLights);
    window.addEventListener('load', addCubeContainers);
    window.addEventListener('resize', resize);


    setSceneInfo({ scene, camera, renderer, width, height, envMap, world });


    return () => {
      canvas.current.removeChild(renderer.domElement);
      window.removeEventListener('load', addLights);
      window.removeEventListener('resize', resize);
    };
  }, []);


  const createCubes = () => {
    if (!sceneInfo) return;
    const newCubes = cubes;

    cubeContainers.forEach((cubeContainer, index) => {
      const { left, top, width: w, height: h } = cubeContainer.getBoundingClientRect();
      // const x = left;
      // const y = top;
      const x = left - 10 + w / 2;
      const y = top - 10 + h / 2;

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
          const cube = createCube(cubeType, x, y);
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

  useEffect(createCubes, [resources]);

  return (
    <div className="scene" ref={canvas} />
  );
}

const forwardedRef = forwardRef(SceneManager);

export default forwardedRef;
