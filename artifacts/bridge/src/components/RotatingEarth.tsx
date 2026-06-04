"use client"

import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"

interface RotatingEarthProps {
  width?: number
  height?: number
  className?: string
}

export default function RotatingEarth({ width = 800, height = 600, className = "" }: RotatingEarthProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const context = canvas.getContext("2d")
    if (!context) return

    const containerWidth  = Math.min(width, window.innerWidth - 40)
    const containerHeight = Math.min(height, window.innerHeight - 100)
    const radius = Math.min(containerWidth, containerHeight) / 2.5

    const dpr = window.devicePixelRatio || 1
    canvas.width  = containerWidth * dpr
    canvas.height = containerHeight * dpr
    canvas.style.width  = `${containerWidth}px`
    canvas.style.height = `${containerHeight}px`
    context.scale(dpr, dpr)

    const projection = d3
      .geoOrthographic()
      .scale(radius)
      .translate([containerWidth / 2, containerHeight / 2])
      .clipAngle(90)

    const path = d3.geoPath().projection(projection).context(context)

    /* ── Cache expensive objects ─────────────────────────────── */
    const graticule = d3.geoGraticule()()   // created ONCE, reused every frame

    /* ── Dark-mode: read once, re-check only on media change ── */
    let isDark = document.documentElement.classList.contains('dark')
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const onSchemeChange = () => {
      isDark = document.documentElement.classList.contains('dark') || mql.matches
    }
    mql.addEventListener('change', onSchemeChange)

    /* ── Point-in-polygon helpers ────────────────────────────── */
    const pointInPolygon = (point: [number, number], polygon: number[][]): boolean => {
      const [x, y] = point
      let inside = false
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i]
        const [xj, yj] = polygon[j]
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
          inside = !inside
        }
      }
      return inside
    }

    const pointInFeature = (point: [number, number], feature: any): boolean => {
      const geometry = feature.geometry
      if (geometry.type === "Polygon") {
        const coords = geometry.coordinates
        if (!pointInPolygon(point, coords[0])) return false
        for (let i = 1; i < coords.length; i++) {
          if (pointInPolygon(point, coords[i])) return false
        }
        return true
      } else if (geometry.type === "MultiPolygon") {
        for (const polygon of geometry.coordinates) {
          if (pointInPolygon(point, polygon[0])) {
            let inHole = false
            for (let i = 1; i < polygon.length; i++) {
              if (pointInPolygon(point, polygon[i])) { inHole = true; break }
            }
            if (!inHole) return true
          }
        }
        return false
      }
      return false
    }

    const generateDotsInPolygon = (feature: any, dotSpacing = 16) => {
      const dots: [number, number][] = []
      const bounds = d3.geoBounds(feature)
      const [[minLng, minLat], [maxLng, maxLat]] = bounds
      const stepSize = dotSpacing * 0.08
      for (let lng = minLng; lng <= maxLng; lng += stepSize) {
        for (let lat = minLat; lat <= maxLat; lat += stepSize) {
          const point: [number, number] = [lng, lat]
          if (pointInFeature(point, feature)) dots.push(point)
        }
      }
      return dots
    }

    /* lat/lng stored as flat array pairs for cache efficiency */
    const allDots: Float32Array[] = []   // each entry = [lng, lat]

    const render = () => {
      context.clearRect(0, 0, containerWidth, containerHeight)
      const currentScale = projection.scale()
      const scaleFactor  = currentScale / radius
      const strokeColor  = isDark ? "#ffffff" : "#000000"

      /* Globe outline */
      context.beginPath()
      context.arc(containerWidth / 2, containerHeight / 2, currentScale, 0, 2 * Math.PI)
      context.fillStyle   = "rgba(0,0,0,0)"
      context.fill()
      context.strokeStyle = strokeColor
      context.lineWidth   = 1 * scaleFactor
      context.globalAlpha = isDark ? 0.1 : 0.2
      context.stroke()
      context.globalAlpha = 1

      /* Graticule — pre-built object, no allocation */
      context.beginPath()
      path(graticule)
      context.strokeStyle = strokeColor
      context.lineWidth   = 1 * scaleFactor
      context.globalAlpha = isDark ? 0.05 : 0.1
      context.stroke()
      context.globalAlpha = 1

      /* Land outlines */
      context.beginPath()
      for (const f of landFeaturesList) path(f)
      context.strokeStyle = strokeColor
      context.lineWidth   = 1 * scaleFactor
      context.globalAlpha = isDark ? 0.2 : 0.4
      context.stroke()
      context.globalAlpha = 1

      /* ── Dots: ONE beginPath → many arc() → ONE fill ── */
      const dotR = 1 * scaleFactor
      context.beginPath()
      for (const pair of allDots) {
        const projected = projection([pair[0], pair[1]])
        if (
          projected &&
          projected[0] >= 0 && projected[0] <= containerWidth &&
          projected[1] >= 0 && projected[1] <= containerHeight
        ) {
          context.moveTo(projected[0] + dotR, projected[1])
          context.arc(projected[0], projected[1], dotR, 0, 2 * Math.PI)
        }
      }
      context.fillStyle   = "#3b82f6"
      context.globalAlpha = 0.8
      context.fill()
      context.globalAlpha = 1
    }

    let landFeaturesList: any[] = []

    const loadWorldData = async () => {
      try {
        setIsLoading(true)
        const response = await fetch("/world.geo.json")
        if (!response.ok) throw new Error("Failed to load land data")
        const landFeatures = await response.json()
        landFeaturesList = landFeatures.features

        for (const feature of landFeatures.features) {
          const dots = generateDotsInPolygon(feature, 24)
          for (const [lng, lat] of dots) {
            const pair = new Float32Array(2)
            pair[0] = lng
            pair[1] = lat
            allDots.push(pair)
          }
        }
        render()
        setIsLoading(false)
      } catch (err) {
        console.error("Earth error:", err)
        setError("Failed to load land map data")
        setIsLoading(false)
      }
    }

    /* ── Rotation loop: cap at ~30fps, pause when off-screen ── */
    const rotation: [number, number, number] = [0, 0, 0]
    let autoRotate    = true
    let isVisible     = true
    const rotationSpeed = 0.5
    const FPS_CAP     = 30
    const MS_PER_FRAME = 1000 / FPS_CAP
    let lastFrameTime = 0

    const rotate = (elapsed: number) => {
      if (!isVisible) return
      if (elapsed - lastFrameTime < MS_PER_FRAME) return
      lastFrameTime = elapsed
      if (autoRotate) {
        rotation[0] += rotationSpeed
        projection.rotate(rotation)
        render()
      }
    }

    const rotationTimer = d3.timer(rotate)

    /* ── Intersection Observer: pause when scrolled out of view ── */
    const observer = new IntersectionObserver(
      (entries) => { isVisible = entries[0].isIntersecting },
      { threshold: 0.05 }
    )
    observer.observe(canvas)

    /* ── Drag ── */
    const handleMouseDown = (event: MouseEvent) => {
      autoRotate = false
      const startX = event.clientX, startY = event.clientY
      const startRotation = [...rotation]

      const handleMouseMove = (e: MouseEvent) => {
        const sensitivity = 0.5
        rotation[0] = startRotation[0] + (e.clientX - startX) * sensitivity
        rotation[1] = Math.max(-90, Math.min(90, startRotation[1] - (e.clientY - startY) * sensitivity))
        projection.rotate(rotation)
        render()
      }
      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
        setTimeout(() => { autoRotate = true }, 10)
      }
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    /* ── Touch ── */
    const handleTouchStart = (event: TouchEvent) => {
      autoRotate = false
      if (!event.touches.length) return
      const touch = event.touches[0]
      const startX = touch.clientX, startY = touch.clientY
      const startRotation = [...rotation]

      const handleTouchMove = (e: TouchEvent) => {
        if (!e.touches.length) return
        const t = e.touches[0]
        const dx = t.clientX - startX, dy = t.clientY - startY
        if (Math.abs(dx) > Math.abs(dy) && e.cancelable) e.preventDefault()
        const s = 0.5
        rotation[0] = startRotation[0] + dx * s
        rotation[1] = Math.max(-90, Math.min(90, startRotation[1] - dy * s))
        projection.rotate(rotation)
        render()
      }
      const handleTouchEnd = () => {
        document.removeEventListener("touchmove", handleTouchMove)
        document.removeEventListener("touchend", handleTouchEnd)
        document.removeEventListener("touchcancel", handleTouchEnd)
        setTimeout(() => { autoRotate = true }, 10)
      }
      document.addEventListener("touchmove", handleTouchMove, { passive: false })
      document.addEventListener("touchend", handleTouchEnd)
      document.addEventListener("touchcancel", handleTouchEnd)
    }

    /* ── Zoom ── */
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      const factor = event.deltaY > 0 ? 0.9 : 1.1
      projection.scale(Math.max(radius * 0.5, Math.min(radius * 3, projection.scale() * factor)))
      render()
    }

    canvas.addEventListener("mousedown", handleMouseDown)
    canvas.addEventListener("touchstart", handleTouchStart, { passive: false })
    canvas.addEventListener("wheel", handleWheel, { passive: false })

    loadWorldData()

    return () => {
      rotationTimer.stop()
      observer.disconnect()
      mql.removeEventListener('change', onSchemeChange)
      canvas.removeEventListener("mousedown", handleMouseDown)
      canvas.removeEventListener("touchstart", handleTouchStart)
      canvas.removeEventListener("wheel", handleWheel)
    }
  }, [width, height])

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-zinc-100 dark:bg-white/5 rounded-2xl p-8 ${className}`}>
        <div className="text-center">
          <p className="text-red-500 font-semibold mb-2">Error loading Earth visualization</p>
          <p className="text-zinc-500 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="w-full h-auto cursor-grab active:cursor-grabbing"
        style={{ maxWidth: "100%", height: "auto" }}
      />
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-zinc-500 font-medium px-3 py-1.5 rounded-full bg-white/80 dark:bg-black/50 backdrop-blur-md border border-zinc-200 dark:border-white/10 uppercase tracking-widest pointer-events-none">
        Drag to rotate • Scroll to zoom
      </div>
    </div>
  )
}
