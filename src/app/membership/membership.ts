import { Component, AfterViewInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { ScrollAnimationService } from '../shared/scroll-animation.service';
import { FloatingTextWidget } from './floating-text-widget/floating-text-widget';

@Component({
  selector: 'app-membership',
  imports: [FloatingTextWidget],
  templateUrl: './membership.html',
  styleUrl: './membership.scss',
})
export class Membership implements AfterViewInit, OnDestroy {
  @ViewChild('benefitMain', { static: false }) benefitMain!: ElementRef;
  @ViewChild('benefitSecondary1', { static: false }) benefitSecondary1!: ElementRef;
  @ViewChild('benefitSecondary2', { static: false }) benefitSecondary2!: ElementRef;
  @ViewChild('benefitSecondary3', { static: false }) benefitSecondary3!: ElementRef;
  @ViewChild('benefitSecondary4', { static: false }) benefitSecondary4!: ElementRef;
  @ViewChild('benefitSecondary5', { static: false }) benefitSecondary5!: ElementRef;

  constructor(private scrollAnimationService: ScrollAnimationService) {}

  ngAfterViewInit() {
    const elements = [
      this.benefitMain?.nativeElement,
      this.benefitSecondary1?.nativeElement,
      this.benefitSecondary2?.nativeElement,
      this.benefitSecondary3?.nativeElement,
      this.benefitSecondary4?.nativeElement,
      this.benefitSecondary5?.nativeElement
    ].filter(el => el) as HTMLElement[];

    this.scrollAnimationService.start(elements);
  }

  ngOnDestroy() {
    this.scrollAnimationService.stop();
  }
}
