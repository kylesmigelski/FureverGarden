import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
  ChangeDetectorRef,
  OnDestroy,
  HostListener
} from '@angular/core';
import {Observable, Subscription} from 'rxjs'; // Import Observable/Subscription
import {
  TributeService,
  TributePoint,
  NewTributePayload
} from '../../services/tribute.service';
import {PendingTribute} from '../newtribute/newtribute.component';


@Component({
  selector: 'app-canvas',
  templateUrl: './canvas.component.html',
  styleUrls: ['./canvas.component.scss'],
})
export class CanvasComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('newTributeModalElement') newTributeModalElementRef?: ElementRef<HTMLElement>;
  @ViewChild('viewTributeModalElement') viewTributeModalElementRef?: ElementRef<HTMLElement>;
  private justOpenedModal = false;
  // --- Visual & Zone Config---
  readonly VISUAL_HEIGHT = 12000;
  readonly spaceLimit = 4000;
  readonly skyLimit = 5900;
  readonly surfaceLimit = 7500;
  readonly rootsLimit = 9000;
  readonly spaceEndPerc: string;
  readonly skyEndPerc: string;
  readonly surfaceEndPerc: string;
  readonly rootsEndPerc: string;

  // --- Child Component Inputs ---
  readonly starZoneLimit = this.skyLimit;
  readonly starRenderCount = 550; // Or from config
  readonly starTaperHeight = 4000;
  readonly starTaperExponent = 2;

  // --- Tribute Data (Get from Service) ---
  tributes$!: Observable<TributePoint[]>;

  // --- New Tribute Modal State ---
  isNewTributeModalVisible: boolean = false;
  pendingTribute: PendingTribute | null = null;

  // --- Details Modal State ---
  isDetailsModalVisible: boolean = false;
  selectedTributeForModal: TributePoint | null = null; // Renamed to avoid conflict
  detailsModalX: number = 0;
  detailsModalY: number = 0;

  // --- Scrolling State (Keep) ---
  private scrollContainer: HTMLElement | Window = window;
  private animationFrameId: number | null = null;
  private isAutoScrolling = false;

  private readonly detailsModalWidthEstimate = 300; // min-width + padding
  private readonly detailsModalHeightEstimate = 600; // Estimate based on content lines
  private readonly newModalWidthEstimate = 300;
  private readonly newModalHeightEstimate = 455; // Estimate based on form elements
  private readonly viewportMargin = 0;  // Minimum space from viewport edges
  private readonly cursorMargin = 0;   // Space away from cursor, especially when flipped


  constructor(
    private cdRef: ChangeDetectorRef,
    private elRef: ElementRef,
    private tributeService: TributeService // Inject the service
  ) {
    // Percentages calculation (Keep)
    const totalH = this.VISUAL_HEIGHT;
    this.spaceEndPerc = `${(this.spaceLimit / totalH) * 100}%`;
    this.skyEndPerc = `${(this.skyLimit / totalH) * 100}%`;
    this.surfaceEndPerc = `${(this.surfaceLimit / totalH) * 100}%`;
    this.rootsEndPerc = `${(this.rootsLimit / totalH) * 100}%`;
    this.tributes$ = this.tributeService.tributes$; // Subscribe to tributes
  }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    // Scroll setup (Keep)
    const containerElement = this.elRef.nativeElement.querySelector('.canvas-container');
    if (containerElement && getComputedStyle(containerElement).overflowY === 'auto' || getComputedStyle(containerElement).overflowY === 'scroll') {
      this.scrollContainer = containerElement;
      console.log('ngAfterViewInit - Identified .canvas-container as scroll container.');
    } else {
      this.scrollContainer = window; // Fallback to window if container isn't scrollable
      console.log('ngAfterViewInit - .canvas-container not scrollable, assuming WINDOW scroll.');
    }
    requestAnimationFrame(() => {
      this.animateScrollToSurface(2000);
    });
  }

  ngOnDestroy(): void {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
  }

  // --- Host Listener for Document Clicks ---
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.justOpenedModal) {
      console.log('Ignoring click because modal just opened');
      return;
    }

    const canvasElement = this.elRef.nativeElement.querySelector('.tribute-canvas');
    const clickedElement = event.target as Node;
    console.log('Clicked element:', clickedElement);

    // if we clicked the canvas, close the modal
    if (canvasElement && canvasElement.contains(clickedElement)) {
      this.closeNewTributeModal();
      this.closeDetailsModal();
    }

  }

  private calculateSafeModalPosition(
    clickX: number,
    clickY: number,
    modalWidth: number,
    modalHeight: number
  ): { x: number, y: number } {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const vpMargin = this.viewportMargin;
    const crMargin = this.cursorMargin; // Cursor offset

    let finalX: number;
    let finalY: number;

    // --- Determine Horizontal Position (X) ---
    const wouldOverflowRight = (clickX + crMargin + modalWidth) > (viewportWidth - vpMargin);

    if (wouldOverflowRight) {
      // Flip to the left of the cursor
      finalX = clickX - modalWidth - crMargin;
      // Clamp to left edge if flipping *still* overflows left
      if (finalX < vpMargin) {
        finalX = vpMargin;
      }
    } else {
      // Place to the right of the cursor (default)
      finalX = clickX + crMargin;
      // Clamp to left edge if default overflows left (unlikely but possible)
      if (finalX < vpMargin) {
        finalX = vpMargin;
      }
    }

    const wouldOverflowBottom = (clickY + crMargin + modalHeight) > (viewportHeight - vpMargin);

    if (wouldOverflowBottom) {
      // Flip above the cursor
      finalY = clickY - modalHeight - crMargin;
      // Clamp to top edge if flipping *still* overflows top
      if (finalY < vpMargin) {
        finalY = vpMargin;
      }
    } else {
      // Place below the cursor (default)
      finalY = clickY + crMargin;
      // Clamp to top edge if default overflows top
      if (finalY < vpMargin) {
        finalY = vpMargin;
      }
    }

    return {x: finalX, y: finalY};
  }

  // --- Event Handlers ---

  // Main Canvas Click Handler
  openNewTributeModal(event: MouseEvent): void {
    if (this.animationFrameId) { /* ... cancel scroll ... */
    }
    const targetElement = event.target as HTMLElement;
    if (targetElement.closest('.tribute-point') || targetElement.closest('.floating-modal')) return;
    if (this.isNewTributeModalVisible || this.isDetailsModalVisible) return;

    const canvasElement = this.elRef.nativeElement.querySelector('.tribute-canvas');
    if (!canvasElement) {
      console.error("Canvas element not found!");
      return;
    }
    const boundingRect = canvasElement.getBoundingClientRect();

    const clickX = event.clientX - boundingRect.left;
    const clickY_absolute = event.clientY - boundingRect.top;

    const zone = this.tributeService.getZoneByY(clickY_absolute);
    const icon = this.tributeService.getDefaultIconByZone(zone);

    this.justOpenedModal = true;

    // Calculate safe position for the modal itself using viewport coords
    const safePos = this.calculateSafeModalPosition(
      event.clientX, // Use viewport click coords for modal positioning
      event.clientY,
      this.newModalWidthEstimate,
      this.newModalHeightEstimate
    );

    this.pendingTribute = {
      x: clickX,
      y: clickY_absolute, // Use absolute Y
      modalX: safePos.x,
      modalY: safePos.y,
      icon: icon, // Use calculated icon
      zone: zone  // Use calculated zone
    };
    this.isNewTributeModalVisible = true;
    this.isDetailsModalVisible = false;
    this.cdRef.detectChanges();
    setTimeout(() => { this.justOpenedModal = false; }, 0);
  }

  // Handler for New Tribute Modal Confirmation
  handleNewTributeConfirm(formData: { name: string, description: string, photoS3Key: string | null }): void {
    if (!this.pendingTribute) return;

    const newTributePayload: NewTributePayload = {
      x: this.pendingTribute.x,
      y: this.pendingTribute.y,
      name: formData.name,
      description: formData.description,
      photoS3Key: formData.photoS3Key
    };
    console.log('Canvas: Calling tributeService.addTribute with:', newTributePayload);

    this.tributeService.addTribute(newTributePayload)
      .subscribe({ // Subscribe to ensure the call is made and handle results
        next: (addedTribute) => {
          console.log('Canvas: Tribute added successfully via service:', addedTribute);
        },
        error: (err) => {
          console.error('Canvas: Failed to add tribute:', err);
        },
        complete: () => {
          // Runs after next/error. Safe place to close modal regardless of success/fail?
          // Or maybe only close on success (inside next block)
        }
      });

    this.closeNewTributeModal();
  }

  // Handler for New Tribute Modal Cancellation
  handleNewTributeCancel(): void {
    this.closeNewTributeModal();
  }

  private closeNewTributeModal(): void {
    this.isNewTributeModalVisible = false;
    this.pendingTribute = null;
    this.cdRef.detectChanges();
  }

  // Handler for clicking an existing tribute point (from TributeLayerComponent)
  handleTributeClick(payload: { tribute: TributePoint, event: MouseEvent }): void {
    if (this.isNewTributeModalVisible) this.closeNewTributeModal();

    this.justOpenedModal = true;

    // Calculate safe position for the details modal
    const safePos = this.calculateSafeModalPosition(
      payload.event.clientX, // Use viewport click coords
      payload.event.clientY,
      this.detailsModalWidthEstimate,
      this.detailsModalHeightEstimate
    );

    this.selectedTributeForModal = payload.tribute;
    this.detailsModalX = safePos.x;
    this.detailsModalY = safePos.y;
    console.log(`Canvas: Setting details modal coords: X=${this.detailsModalX}, Y=${this.detailsModalY}`);
    this.isDetailsModalVisible = true;
    this.cdRef.detectChanges();
    setTimeout(() => { this.justOpenedModal = false; }, 0);
  }

  // Handler for closing the Details Modal
  handleDetailsClose(): void {
    this.closeDetailsModal();
  }

  private closeDetailsModal(): void {
    this.isDetailsModalVisible = false;
    this.selectedTributeForModal = null;
    this.cdRef.detectChanges();
  }

  customSmoothScrollTo(targetY: number, duration: number): void {
    if (!this.scrollContainer) return;

    // Cancel any previous animation
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.isAutoScrolling = true; // Set flag

    const startY = this.getCurrentScrollTop();
    const distance = targetY - startY;
    let startTime: number | null = null;

    // Basic ease-in-out function (quadratic)
    const easeInOutQuad = (t: number): number => {
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    };

    const scrollStep = (timestamp: number) => {
      if (!startTime) {
        startTime = timestamp;
      }
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1); // Ensure progress doesn't exceed 1
      const easedProgress = easeInOutQuad(progress);

      const newScrollTop = startY + distance * easedProgress;
      this.setScrollTop(newScrollTop);

      if (progress < 1) {
        // Continue animation
        this.animationFrameId = requestAnimationFrame(scrollStep);
      } else {
        // Animation finished
        // console.log('Custom scroll finished');
        this.animationFrameId = null;
        // Add a small delay before resetting the flag to avoid immediate wrap triggers
        setTimeout(() => this.isAutoScrolling = false, 50);
      }
    };

    // Start the animation loop
    this.animationFrameId = requestAnimationFrame(scrollStep);
  }

  /** Helper to get current scroll top for window or element */
  private getCurrentScrollTop(): number {
    if (this.scrollContainer instanceof Window) {
      return window.pageYOffset || document.documentElement.scrollTop;
    } else if (this.scrollContainer instanceof HTMLElement) {
      return this.scrollContainer.scrollTop;
    }
    return 0;
  }

  /** Helper to set scroll top for window or element */
  private setScrollTop(value: number): void {
    if (this.scrollContainer instanceof Window) {
      window.scrollTo({top: value, behavior: 'auto'}); // Use instant within the animation loop
    } else if (this.scrollContainer instanceof HTMLElement) {
      this.scrollContainer.scrollTop = value;
    }
  }


  // --- Animated Scroll Trigger ---
  animateScrollToSurface(duration: number = 1500): void {
    if (!this.scrollContainer) return;

    const surfaceZoneStartY = this.skyLimit; // Surface starts where sky ends
    const targetScrollTop = surfaceZoneStartY - 450;

    let currentScrollHeight = 0;
    let currentClientHeight = 0;
    // ... (get scrollHeight/clientHeight as before) ...
    if (this.scrollContainer instanceof Window) {
      currentScrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
      currentClientHeight = window.innerHeight;
    } else if (this.scrollContainer instanceof HTMLElement) {
      currentScrollHeight = this.scrollContainer.scrollHeight;
      currentClientHeight = this.scrollContainer.clientHeight;
    }

    // Check reachability
    if (currentScrollHeight > targetScrollTop) {
      this.customSmoothScrollTo(targetScrollTop, duration);
    } else {
      console.warn(`Target scroll Y=${targetScrollTop} may not be reachable! Scroll Height: ${currentScrollHeight}. Scrolling to max possible.`);
      const maxScroll = currentScrollHeight - currentClientHeight;
      this.customSmoothScrollTo(maxScroll > 0 ? maxScroll : 0, duration);
    }
  }

}
