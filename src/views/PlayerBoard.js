import React, { useRef, useState } from 'react';
import ResourcePanel from './ResourcePanel';
import SceneManager from './SceneManager';
import { resourceTypes } from './Utility';

export default function PlayerBoard() {
  const resourceRefs = useRef([]);

  const colors = {
    credits: { color: 'rgba(253,223,1,255)', background: 'rgba(244,233,222,255)' },
    steel: { color: 'rgba(171,124,86,255)', background: 'rgba(229,194,154,255)' },
    titanium: { color: 'rgba(110,112,112,255)', background: 'rgba(165,166,171,255)' },
    plants: { color: 'rgba(130,188,72,255)', background: 'rgba(191,159,146,255)' },
    energy: { color: 'rgba(158,62,141,255)', background: 'rgba(209,211,233,255)' },
    heat: { color: 'rgba(235,98,56,255)', background: 'rgba(251,213,179,255)' },
  };

  const resources = {};
  Object.keys(resourceTypes).forEach((type) => {
    const [resource, setResource] = useState(0);
    const [production, setProduction] = useState(1);

    resources[type] = { type, resource, setResource, production, setProduction, colors: colors[type] };
  });

  const startProduction = () => {
    let remainingEnergy;
    Object.keys(resources).forEach((type) => {
      const { resource, setResource, production } = resources[type];

      if (type === 'energy') {
        remainingEnergy = resource;
        setResource(production);
      }
      else if (type === 'heat') {
        setResource(resource + production + remainingEnergy);
      }
      else setResource(resource + production);
    });
  };

  const resetBoard = () => {
    Object.keys(resources).forEach((type) => {
      const { setResource, setProduction } = resources[type];
      setResource(0);
      setProduction(1);
    });

    window.location.reload();
  };

  const convertResource = (type) => {
    resources[type].setResource(resources[type].resource - 8);
  };

  return (
    <div className="board">
      <SceneManager resources={resources} ref={resourceRefs} />
      <div className="board-header">Terraforming Mars Assistant</div>

      <div className="board-resources">
        {Object.keys(resources).map((resource, i) => <ResourcePanel ref={el => resourceRefs.current[i] = el} key={resource} state={resources[resource]} />)}
      </div>
      <div className="board-controls">
        <button type="button" onClick={startProduction}>Production Phase</button>
        <button type="button" onClick={() => convertResource(resourceTypes.plants)} disabled={resources[resourceTypes.plants].resource < 8}>Create Greenery</button>
        <button type="button" onClick={() => convertResource(resourceTypes.heat)} disabled={resources[resourceTypes.heat].resource < 8}>Raise Temperature</button>
        <button type="button" onClick={resetBoard}>Reset Board</button>

      </div>
    </div>
  );
}
