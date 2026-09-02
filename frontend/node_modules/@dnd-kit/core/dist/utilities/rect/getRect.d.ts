import type { ClientRect, LayoutRect, ViewRect } from '../../types';
export declare function getElementLayout(element: HTMLElement): LayoutRect;
export declare function getBoundingClientRect(element: HTMLElement | Window): ClientRect;
export declare function getViewRect(element: HTMLElement): ViewRect;
