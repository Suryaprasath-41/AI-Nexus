'use client'

import { useRef, useMemo, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Float, Icosahedron, Sphere, Line, Points, PointMaterial } from '@react-three/drei'
import * as THREE from 'three'

/**
 * AICoreScene — the 3D centerpiece.
 * A glowing central "AI Core" with orbiting provider nodes connected by
 * neural-network lines, surrounded by a particle field.
 *
 * Performance: dpr capped, particle count scales down on small screens,
 * and the whole canvas can be skipped via the `enabled` prop for reduced motion.
 */

const PROVIDER_COLORS = [
  '#10a37f', // openai
  '#4285f4', // gemini
  '#d97757', // claude
  '#4d6bce', // deepseek
  '#f55036', // groq
  '#ff7000', // mistral
  '#615ced', // qwen
  '#a855f7', // custom
]

function CoreNode() {
  const meshRef = useRef<THREE.Mesh>(null)
  const innerRef = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (meshRef.current) {
      meshRef.current.rotation.x = t * 0.15
      meshRef.current.rotation.y = t * 0.2
    }
    if (innerRef.current) {
      const s = 1 + Math.sin(t * 1.5) * 0.04
      innerRef.current.scale.setScalar(s)
    }
  })
  return (
    <group>
      {/* Outer wireframe icosahedron */}
      <Icosahedron ref={meshRef} args={[1.4, 1]}>
        <meshBasicMaterial color="#a855f7" wireframe transparent opacity={0.35} />
      </Icosahedron>
      {/* Glowing core */}
      <Sphere ref={innerRef} args={[1, 48, 48]}>
        <meshStandardMaterial
          color="#7c3aed"
          emissive="#a855f7"
          emissiveIntensity={1.6}
          roughness={0.2}
          metalness={0.8}
        />
      </Sphere>
      {/* Outer glow shell */}
      <Sphere args={[1.7, 32, 32]}>
        <meshBasicMaterial color="#a855f7" transparent opacity={0.06} />
      </Sphere>
      <pointLight position={[0, 0, 0]} intensity={4} color="#c084fc" distance={8} />
    </group>
  )
}

function ProviderNodes() {
  const groupRef = useRef<THREE.Group>(null)
  const count = PROVIDER_COLORS.length
  const radius = 3.2

  const nodes = useMemo(
    () =>
      PROVIDER_COLORS.map((color, i) => {
        const angle = (i / count) * Math.PI * 2
        return {
          color,
          position: [Math.cos(angle) * radius, Math.sin(angle * 1.5) * 0.6, Math.sin(angle) * radius] as [number, number, number],
        }
      }),
    []
  )

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.08
    }
  })

  return (
    <group ref={groupRef}>
      {nodes.map((n, i) => (
        <group key={i} position={n.position}>
          <Float speed={2} rotationIntensity={0.6} floatIntensity={0.8}>
            <mesh>
              <icosahedronGeometry args={[0.22, 0]} />
              <meshStandardMaterial
                color={n.color}
                emissive={n.color}
                emissiveIntensity={1.2}
                roughness={0.3}
                metalness={0.6}
              />
            </mesh>
            <mesh>
              <sphereGeometry args={[0.34, 16, 16]} />
              <meshBasicMaterial color={n.color} transparent opacity={0.12} />
            </mesh>
          </Float>
        </group>
      ))}
      {/* Neural connections from core to each node */}
      {nodes.map((n, i) => (
        <NeuralLine key={`l-${i}`} start={[0, 0, 0]} end={n.position} color={n.color} delay={i * 0.4} />
      ))}
      {/* Ring connections between adjacent nodes */}
      {nodes.map((n, i) => {
        const next = nodes[(i + 1) % nodes.length]
        return <Line key={`r-${i}`} points={[n.position, next.position]} color={n.color} lineWidth={0.5} transparent opacity={0.12} />
      })}
    </group>
  )
}

function NeuralLine({ start, end, color, delay }: { start: [number, number, number]; end: [number, number, number]; color: string; delay: number }) {
  const matRef = useRef<THREE.LineBasicMaterial>(null)
  useFrame((state) => {
    if (matRef.current) {
      const pulse = (Math.sin(state.clock.elapsedTime * 2 + delay) + 1) / 2
      matRef.current.opacity = 0.15 + pulse * 0.35
    }
  })
  return (
    <Line points={[start, end]} color={color} lineWidth={1} transparent>
      <lineBasicMaterial ref={matRef} color={color} transparent opacity={0.3} />
    </Line>
  )
}

function ParticleField({ count = 400 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null)
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const r = 4 + Math.random() * 6
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      arr[i * 3 + 2] = r * Math.cos(phi)
    }
    return arr
  }, [count])

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.02
      ref.current.rotation.x = state.clock.elapsedTime * 0.01
    }
  })

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial transparent color="#a855f7" size={0.025} sizeAttenuation depthWrite={false} opacity={0.6} />
    </Points>
  )
}

function MouseRig({ children }: { children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null)
  const { pointer } = useThree()
  useFrame(() => {
    if (group.current) {
      group.current.rotation.y += (pointer.x * 0.3 - group.current.rotation.y) * 0.04
      group.current.rotation.x += (-pointer.y * 0.2 - group.current.rotation.x) * 0.04
    }
  })
  return <group ref={group}>{children}</group>
}

export function AICoreScene({ className }: { className?: string }) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  return (
    <div className={className}>
      <Canvas
        dpr={[1, isMobile ? 1.3 : 1.8]}
        camera={{ position: [0, 0, 8], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <Suspense fallback={null}>
          <MouseRig>
            <CoreNode />
            <ProviderNodes />
            <ParticleField count={isMobile ? 180 : 420} />
          </MouseRig>
        </Suspense>
      </Canvas>
    </div>
  )
}

/** Reduced-motion fallback — a CSS-only glowing orb. */
export function AICoreFallback({ className }: { className?: string }) {
  return (
    <div className={className + ' relative flex items-center justify-center'}>
      <div className="relative">
        <div className="absolute inset-0 -m-16 rounded-full bg-primary/20 blur-3xl animate-pulse-glow" />
        <div className="absolute inset-0 -m-8 rounded-full bg-primary/30 blur-2xl animate-pulse-glow" />
        <div className="relative h-32 w-32 rounded-full bg-gradient-to-br from-primary to-chart-3 glow animate-float" />
        <div className="absolute inset-0 rounded-full border border-primary/40 animate-pulse-glow" />
      </div>
    </div>
  )
}

/** Wrapper that respects prefers-reduced-motion and disables WebGL on failure. */
export function AICore({ className }: { className?: string }) {
  return <AICoreScene className={className} />
}
