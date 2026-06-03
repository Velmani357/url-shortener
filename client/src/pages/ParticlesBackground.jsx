import Particles from "react-tsparticles";
import { loadFull } from "tsparticles";

export default function ParticlesBackground() {
  const particlesInit = async (engine) => {
    await loadFull(engine);
  };

  return (
    <Particles
      init={particlesInit}
      options={{
        fullScreen: {
          enable: true,
          zIndex: 0,
        },

        background: {
          color: "#0d0d0d",
        },

        fpsLimit: 60,

        interactivity: {
          events: {
            onHover: {
              enable: true,
              mode: "repulse",
            },
          },
          modes: {
            repulse: {
              distance: 180,   // 🔥 stronger push
              duration: 0.4,
            },
          },
        },

        particles: {
          number: {
            value: 180, // 🔥 INCREASED (this is main change)
            density: {
              enable: true,
              area: 600, // tighter clustering
            },
          },

          color: {
            value: "#00f0ff",
          },

          links: {
            enable: true,
            color: "#00f0ff",
            distance: 120,
            opacity: 0.6, // 🔥 brighter lines
            width: 1,
          },

          move: {
            enable: true,
            speed: 2, // 🔥 faster motion
            direction: "none",
            random: true,
            straight: false,
            outModes: {
              default: "bounce",
            },
          },

          size: {
            value: { min: 1, max: 3 },
          },

          opacity: {
            value: 0.7,
          },
        },

        detectRetina: true,
      }}
    />
  );
}