import React, { forwardRef } from 'react';

function ResourcePanel({ state }, ref) {
  const { type, resource, setResource, production, setProduction, colors } = state;
  const intervals = [1];
  const reverseIntervals = intervals.slice(0).reverse();

  const ResourceControls = ({ number, setNumber }) => (
    <div className="resource-controls-grid">
      {reverseIntervals.map(interval => <button className="resource-controls-grid-button" key={interval} type="button" onClick={() => setNumber(number - interval)}>{`-${interval}`}</button>)}
      <div className="resource-controls-grid-count">{number}</div>
      {intervals.map(interval => <button className="resource-controls-grid-button" key={interval} type="button" onClick={() => setNumber(number + interval)}>{`+${interval}`}</button>)}
    </div>
  );

  return (
    <div className="resource" style={{ backgroundColor: colors.background }}>
      <div className="resource-header" ref={ref}>
        <img className="resource-header-image" src={`assets/images/${type}.png`} alt={type} />
        <div className="resource-header-cubes" />
        {/* {type === resourceTypes.plants && <button className="resource-header-convert" type="button" onClick={convertResource} disabled={resource < 8}>Raise Temperature</button>}
        {type === resourceTypes.heat && <button className="resource-header-convert" type="button" onClick={convertResource} disabled={resource < 8}>Create Greenery</button>} */}
      </div>
      <div className="resource-controls">
        <ResourceControls number={resource} setNumber={setResource} />
        <ResourceControls number={production} setNumber={setProduction} />
      </div>
    </div>
  );
}

const forwardedRef = forwardRef(ResourcePanel);

export default forwardedRef;
