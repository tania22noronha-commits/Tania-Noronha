import React, { createContext, useContext, useState } from 'react';

const WorldContext = createContext();

export const useWorld = () => useContext(WorldContext);

export const WorldProvider = ({ children }) => {
  const [currentWorld, setCurrentWorld] = useState(null);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);

  return (
    <WorldContext.Provider value={{ 
      currentWorld, 
      setCurrentWorld,
      isSimulationRunning,
      setIsSimulationRunning
    }}>
      {children}
    </WorldContext.Provider>
  );
};
