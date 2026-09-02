import type { LayoutRect } from '../../types';
export declare const useClientRect: (element: HTMLElement | Window | null, forceRecompute?: boolean | undefined) => import("../../types").ClientRect | null;
export declare const useClientRects: (elements: Element[], forceRecompute?: boolean | undefined) => import("../../types").ClientRect[];
export declare const useViewRect: (element: HTMLElement | null, forceRecompute?: boolean | undefined) => import("../../types").ViewRect | null;
export declare const useLayoutRect: (element: HTMLElement | null, forceRecompute?: boolean | undefined) => LayoutRect | null;
