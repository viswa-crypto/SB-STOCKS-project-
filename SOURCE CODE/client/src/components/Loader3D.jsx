import { Canvas } from "@react-three/fiber";
import { Float, MeshDistortMaterial } from "@react-three/drei";

// A small spinning distorted icosahedron used as the app's loading indicator —
// echoes the hero's "market crystal" so loading states feel like part of the same world.
export default function Loader3D({ size = 64 }) {
  return (
    <div style={{ width: size, height: size }}>
      <Canvas camera={{ position: [0, 0, 3] }}>
        <ambientLight intensity={0.6} />
        <pointLight position={[3, 3, 3]} intensity={2} color="#2FE6A6" />
        <Float speed={4} rotationIntensity={2} floatIntensity={0}>
          <mesh>
            <icosahedronGeometry args={[1, 0]} />
            <MeshDistortMaterial color="#2FE6A6" distort={0.4} speed={5} roughness={0.2} metalness={0.6} />
          </mesh>
        </Float>
      </Canvas>
    </div>
  );
}
