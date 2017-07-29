import { Directive, AfterViewInit, ElementRef, Renderer2, OnDestroy, Input } from '@angular/core';

declare const hljs: any;

import { Subject } from 'rxjs/Subject';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/from';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/switchMap';
import 'rxjs/add/operator/take';
import 'rxjs/add/operator/delay';
import 'rxjs/add/operator/skipWhile';
import { HighlightService } from '../service/highlight.service';

@Directive({
  selector: '[highlight]'
})
export class HighlightDirective implements AfterViewInit, OnDestroy {

  el: HTMLElement;
  domObs: MutationObserver;
  highlighter$ = new Subject<any>();

  @Input('highlight') highlight;
  @Input() hlAuto = true;
  @Input() hlDelay = 200;

  constructor(el: ElementRef, private renderer: Renderer2, private hl: HighlightService) {
    this.el = el.nativeElement;

  }

  ngAfterViewInit() {

    let codeElements: any = [];

    this.highlighter$
      .skipWhile(() => this.notLoaded())
      .delay(this.hlDelay)
      .switchMap(() => {
        switch (this.highlight) {
          case 'all':
            codeElements = this.el.querySelectorAll('pre code');
            break;
          case '':
            codeElements = [this.el];
            break;
          default:
            codeElements = this.el.querySelectorAll(this.highlight);
        }

        return Observable.from(codeElements)
          .take(1)
          .map((code: HTMLElement) => {

            /** Highlight only If content is plain text */
            if (code.childNodes.length === 1 && code.childNodes[0].nodeName === '#text') {

              const highlightedCode = hljs.highlightAuto(code.innerText.trim()).value;

              /** Render the highlighted code */
              if (highlightedCode !== code.innerHTML) {
                this.renderer.setProperty(code, 'innerHTML', highlightedCode);
              }

            }
          });
      }).subscribe();

    /** Load highlight.js script and theme */
    if (this.notLoaded()) {
      this.loadScript();
      this.loadTheme();
    } else {
      this.highlighter$.next();
    }

    /** Auto highlight on changes */
    if (this.hlAuto) {
      this.domObs = new MutationObserver(() => this.highlighter$.next());
      this.domObs.observe(this.el, {childList: true, subtree: true});
    }
  }

  loadScript() {

    const script = this.renderer.createElement('script');
    script.async = true;
    script.type = 'text/javascript';
    script.onload = () => {
      this.highlighter$.next();
    };
    script.src = `${this.hl.path}/highlight.pack.js`;
    this.renderer.setAttribute(script, 'data-timestamp', new Date().getTime().toString());
    this.renderer.appendChild(this.el, script);
  }

  loadTheme() {
    const style = this.renderer.createElement('link');
    style.rel = 'stylesheet';
    style.type = 'text/css';
    // style.onload = () => {
    //   console.log('theme loaded');
    // };
    style.href = `${this.hl.path}/styles/${this.hl.theme}.css`;
    this.renderer.appendChild(this.el, style);
  }

  notLoaded() {
    return typeof hljs === 'undefined';
  }

  ngOnDestroy() {
    if (this.hlAuto) {
      this.domObs.disconnect();
    }
    this.highlighter$.unsubscribe();
  }
}