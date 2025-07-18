import React from 'react';
import './App.css';
import FluidGlass from './components/FluidGlass';

function App() {
  return (
    <div className="App">
      <FluidGlass 
        mode="lens"
        lensProps={{
          navItems: [
            { label: "Home", link: "#home" },
            { label: "About", link: "#about" },
            { label: "Projects", link: "#projects" },
            { label: "Contact", link: "#contact" }
          ]
        }}
      />
    </div>
  );
}

export default App;