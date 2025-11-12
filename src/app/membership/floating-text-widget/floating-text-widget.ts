import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-floating-text-widget',
  imports: [],
  templateUrl: './floating-text-widget.html',
  styleUrl: './floating-text-widget.scss',
})
export class FloatingTextWidget implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  
  private animationFrameId: number | null = null;
  private isRunning = false;
  private textParticles: TextParticle[] = [];
  private mouseX = 0;
  private mouseY = 0;
  private isHovering = false;
  private time = 0;

  ngOnInit() {
    // Initialize multiple text particles
    this.initTextParticles();
  }

  ngAfterViewInit() {
    const canvas = this.canvasRef?.nativeElement;
    if (canvas) {
      this.setupCanvas(canvas);
      this.setupEventListeners(canvas);
      this.startAnimation(canvas);
    }
  }

  ngOnDestroy() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private initTextParticles() {
    this.textParticles = [];
    const words = ['JOIN', 'US', 'JOIN', 'US', 'JOIN', 'US', 'JOIN', 'US', 'JOIN', 'US', 'JOIN', 'US', 'JOIN', 'US', 'JOIN', 'US'];
    
    words.forEach((word, index) => {
      this.textParticles.push({
        text: word,
        x: Math.random() * 100,
        y: Math.random() * 100,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        baseSize: (window.innerWidth <= 768 ? 25 : 40) + Math.random() * (window.innerWidth <= 768 ? 20 : 30), // Smaller on mobile
        scale: 0.8 + Math.random() * 0.4, // Initial scale variation
        scaleSpeed: 0.002 + Math.random() * 0.003, // Speed of scaling animation
        scaleDirection: Math.random() > 0.5 ? 1 : -1, // Random initial direction
        opacity: 0.6 + Math.random() * 0.4
      });
    });
  }

  private setupCanvas(canvas: HTMLCanvasElement) {
    const updateCanvasSize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      const ctx = canvas.getContext('2d')!;
      ctx.scale(dpr, dpr);
      
      // Adjust canvas display size
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
    };
    
    updateCanvasSize();
    
    // Handle resize with debounce for performance
    let resizeTimeout: number;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(updateCanvasSize, 100);
    });
  }

  private setupEventListeners(canvas: HTMLCanvasElement) {
    const updatePosition = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      this.mouseX = ((clientX - rect.left) / rect.width) * 100;
      this.mouseY = ((clientY - rect.top) / rect.height) * 100;
      this.isHovering = true;
    };

    // Mouse events for desktop
    canvas.addEventListener('mousemove', (e) => {
      updatePosition(e.clientX, e.clientY);
    });

    canvas.addEventListener('mouseleave', () => {
      this.isHovering = false;
    });

    // Touch events for mobile
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        updatePosition(touch.clientX, touch.clientY);
      }
    }, { passive: false });

    canvas.addEventListener('touchend', () => {
      this.isHovering = false;
    });

    canvas.addEventListener('touchcancel', () => {
      this.isHovering = false;
    });
  }

  private startAnimation(canvas: HTMLCanvasElement) {
    this.isRunning = true;
    const ctx = canvas.getContext('2d')!;

    const animate = (currentTime: number) => {
      if (!this.isRunning) return;

      this.time = currentTime;
      ctx.clearRect(0, 0, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));

      // Update and draw text particles
      this.textParticles.forEach((particle) => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Animate scale (pulsing effect)
        particle.scale += particle.scaleSpeed * particle.scaleDirection;
        if (particle.scale >= 1.2 || particle.scale <= 0.7) {
          particle.scaleDirection *= -1;
        }
        particle.scale = Math.max(0.7, Math.min(1.2, particle.scale));

        // Bounce off edges with padding
        const padding = 8;
        if (particle.x < padding || particle.x > 100 - padding) {
          particle.vx *= -1;
          particle.x = Math.max(padding, Math.min(100 - padding, particle.x));
        }
        if (particle.y < padding || particle.y > 100 - padding) {
          particle.vy *= -1;
          particle.y = Math.max(padding, Math.min(100 - padding, particle.y));
        }

        // Keep in bounds
        particle.x = Math.max(padding, Math.min(100 - padding, particle.x));
        particle.y = Math.max(padding, Math.min(100 - padding, particle.y));

        // Mouse/touch interaction - stronger repulsion
        if (this.isHovering) {
          const dx = this.mouseX - particle.x;
          const dy = this.mouseY - particle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 25) {
            const force = (25 - distance) / 25;
            const angle = Math.atan2(dy, dx);
            particle.vx -= Math.cos(angle) * force * 0.4;
            particle.vy -= Math.sin(angle) * force * 0.4;
            
            // Scale up when near cursor/touch
            particle.scale = Math.min(1.3, particle.scale + force * 0.1);
          }
        }

        // Add slight friction
        particle.vx *= 0.99;
        particle.vy *= 0.99;

        // Draw text with scaling
        const canvasWidth = canvas.width / (window.devicePixelRatio || 1);
        const canvasHeight = canvas.height / (window.devicePixelRatio || 1);
        const x = (particle.x / 100) * canvasWidth;
        const y = (particle.y / 100) * canvasHeight;
        const size = particle.baseSize * particle.scale;
        
        ctx.save();
        ctx.font = `900 ${size}px 'Inter', sans-serif`; // Extra bold
        ctx.fillStyle = `rgba(90, 127, 184, ${particle.opacity})`; // matte-accent color
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(90, 127, 184, 0.3)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.fillText(particle.text, x, y);
        ctx.restore();
      });

      this.animationFrameId = requestAnimationFrame(animate);
    };

    animate(0);
  }
}

interface TextParticle {
  text: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseSize: number;
  scale: number;
  scaleSpeed: number;
  scaleDirection: number;
  opacity: number;
}
