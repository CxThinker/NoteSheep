export type ScrollbarState = {
  thumbHeight: number;
  thumbTop: number;
  valueMax: number;
  valueNow: number;
};

export const EMPTY_SCROLLBAR: ScrollbarState = {
  thumbHeight: 0,
  thumbTop: 0,
  valueMax: 0,
  valueNow: 0,
};

export function readScrollbarState(element: HTMLElement): ScrollbarState {
  const clientHeight = element.clientHeight;
  const scrollHeight = Math.max(element.scrollHeight, clientHeight);
  if (clientHeight <= 0) {
    return EMPTY_SCROLLBAR;
  }

  const valueMax = Math.max(scrollHeight - clientHeight, 0);
  const minThumbHeight = Math.min(48, clientHeight);
  const thumbHeight =
    valueMax === 0 ? clientHeight : Math.max(minThumbHeight, (clientHeight / scrollHeight) * clientHeight);
  const maxThumbTop = Math.max(clientHeight - thumbHeight, 0);
  const thumbTop = valueMax === 0 ? 0 : (element.scrollTop / valueMax) * maxThumbTop;

  return {
    thumbHeight: Math.round(thumbHeight),
    thumbTop: Math.round(thumbTop),
    valueMax: Math.round(valueMax),
    valueNow: Math.round(element.scrollTop),
  };
}

export function isSameScrollbarState(left: ScrollbarState, right: ScrollbarState) {
  return (
    left.thumbHeight === right.thumbHeight &&
    left.thumbTop === right.thumbTop &&
    left.valueMax === right.valueMax &&
    left.valueNow === right.valueNow
  );
}

export function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
