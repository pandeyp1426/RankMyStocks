import "./AnimatedBackground.css";

const PARTICLE_COUNT = 22;

const particleConfig = Array.from({ length: PARTICLE_COUNT }, (_, index) => {
  const left = Math.random() * 100;
  const scale = 0.7 + Math.random() * 0.8;
  const duration = 18 + Math.random() * 10;
  const delay = -Math.random() * 18;
  const opacity = 0.2 + Math.random() * 0.35;

  return {
    id: `particle-${index}`,
    left,
    scale,
    duration,
    delay,
    opacity,
  };
});

export function AnimatedBackground() {
  return (
    <div className="animated-background" aria-hidden="true">
      <div className="animated-background__gradient" />

      <div className="animated-background__particles">
        {particleConfig.map((particle) => (
          <span
            key={particle.id}
            className="animated-background__particle"
            style={{
              left: `${particle.left}%`,
              animationDuration: `${particle.duration}s`,
              animationDelay: `${particle.delay}s`,
              opacity: particle.opacity,
              transform: `scale(${particle.scale})`,
            }}
          />
        ))}
      </div>

      <svg
        className="animated-background__wave"
        viewBox="0 0 1200 200"
        preserveAspectRatio="none"
        role="presentation"
      >
        <path
          className="animated-background__wave-path"
          d="M0,120 C150,80 300,150 450,120 C600,90 750,140 900,110 C1050,80 1200,130 1350,100"
        />
      </svg>
    </div>
  );
}
