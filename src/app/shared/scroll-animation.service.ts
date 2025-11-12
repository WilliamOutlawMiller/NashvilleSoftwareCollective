import { Injectable, OnDestroy } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ScrollAnimationService implements OnDestroy {
  private rafId: number | null = null;
  private isRunning = false;
  private elements: HTMLElement[] = [];
  private lastScrollY = 0;
  private hasScrolled = false;

  ngOnDestroy() {
    this.stop();
  }

  start(elements: HTMLElement[]) {
    this.elements = elements.filter(el => el);
    
    if (this.elements.length === 0) return;

    this.stop(); // Stop any existing animation
    this.isRunning = true;
    this.lastScrollY = window.scrollY;
    this.hasScrolled = false;

    // Track scrolling to prevent activation on page load
    const handleScroll = () => {
      if (Math.abs(window.scrollY - this.lastScrollY) > 10) {
        this.hasScrolled = true;
      }
      this.lastScrollY = window.scrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    const updateAnimations = () => {
      if (!this.isRunning) {
        window.removeEventListener('scroll', handleScroll);
        return;
      }

      // Don't activate until user has scrolled
      if (!this.hasScrolled) {
        this.elements.forEach(element => {
          element.classList.remove('active');
          element.style.transform = 'scale(1)';
        });
        this.rafId = requestAnimationFrame(updateAnimations);
        return;
      }

      const viewportCenter = window.innerHeight / 2;
      let closestElement: HTMLElement | null = null;
      let closestDistance = Infinity;

      // Narrower activation window - only center 30% of viewport
      const activationZoneTop = viewportCenter - (window.innerHeight * 0.15);
      const activationZoneBottom = viewportCenter + (window.innerHeight * 0.15);

      this.elements.forEach(element => {
        const rect = element.getBoundingClientRect();
        const elementCenter = rect.top + rect.height / 2;
        const distance = Math.abs(elementCenter - viewportCenter);
        const viewportHeight = window.innerHeight;
        
        // Only consider elements that are actually visible in viewport
        // And ensure they're within the narrow activation zone
        if (rect.bottom > 0 && rect.top < viewportHeight) {
          const visibilityRatio = Math.min(
            Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0),
            rect.height
          ) / rect.height;
          
          // Require at least 50% visibility and be within narrow center zone
          // Element center must be within the activation zone
          const isInActivationZone = elementCenter >= activationZoneTop && elementCenter <= activationZoneBottom;
          
          if (visibilityRatio > 0.5 && isInActivationZone && distance < window.innerHeight * 0.25) {
            if (distance < closestDistance) {
              closestDistance = distance;
              closestElement = element;
            }
          }
        }
      });

      this.elements.forEach(element => {
        if (element === closestElement && closestDistance < window.innerHeight * 0.25) {
          const rect = element.getBoundingClientRect();
          const elementCenter = rect.top + rect.height / 2;
          const viewportCenter = window.innerHeight / 2;
          const distance = Math.abs(elementCenter - viewportCenter);
          const maxDistance = window.innerHeight * 0.25;
          const proximity = Math.max(0, 1 - (distance / maxDistance));
          const scale = 1 + (proximity * 0.12);
          
          element.classList.add('active');
          element.style.transform = `scale(${Math.max(1, Math.min(scale, 1.12))})`;
        } else {
          element.classList.remove('active');
          element.style.transform = 'scale(1)';
        }
      });

      this.rafId = requestAnimationFrame(updateAnimations);
    };

    // Delay initial animation and reset all elements
    setTimeout(() => {
      this.elements.forEach(element => {
        element.classList.remove('active');
        element.style.transform = 'scale(1)';
      });
      updateAnimations();
    }, 300);
  }

  stop() {
    this.isRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    // Reset all elements
    this.elements.forEach(element => {
      element.classList.remove('active');
      element.style.transform = 'scale(1)';
    });
  }
}
