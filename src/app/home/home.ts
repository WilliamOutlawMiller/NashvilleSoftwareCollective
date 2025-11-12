import { Component, AfterViewInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ScrollAnimationService } from '../shared/scroll-animation.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements AfterViewInit, OnDestroy {
  @ViewChild('activityMain', { static: false }) activityMain!: ElementRef;
  @ViewChild('activitySecondary1', { static: false }) activitySecondary1!: ElementRef;
  @ViewChild('activitySecondary2', { static: false }) activitySecondary2!: ElementRef;

  constructor(private scrollAnimationService: ScrollAnimationService) {}

  ngAfterViewInit() {
    const elements = [
      this.activityMain?.nativeElement,
      this.activitySecondary1?.nativeElement,
      this.activitySecondary2?.nativeElement
    ].filter(el => el) as HTMLElement[];

    this.scrollAnimationService.start(elements);
  }

  ngOnDestroy() {
    this.scrollAnimationService.stop();
  }
}
