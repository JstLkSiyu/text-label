import { throttle } from 'lodash';

interface Color {
  r: number;
  g: number;
  b: number;
}

abstract class Destructable {
  private _isDestructed: boolean = false;
  protected get isDestructed() {
    return this._isDestructed;
  }
  private destructCallbacks: Array<() => void> | null = null;
  protected addDestructCallback(desctructCallback: () => void) {
    if (this.isDestructed) {
      return;
    }
    this.destructCallbacks!.splice(-1, 0, desctructCallback);
  }
  destruct() {
    if (this.isDestructed) {
      return;
    }
    this.destructCallbacks!.forEach(callback => callback());
    this.destructCallbacks = null;
    this._isDestructed = true;
  }
  constructor(destruct: () => void = () => {}) {
    this.destructCallbacks = [destruct];
  }
}

class LabelLine extends Destructable {
  static compileRangeToLines(range: Range, baseLeft: number, baseTop: number): Array<LabelLine> {
    if (range.collapsed) {
      return [];
    }
    const map: Record<string, LabelLine> = {};
    const rects = range.getClientRects();
    const { length } = rects;
    for (let i = 0; i < length; i++) {
      const rect = rects.item(i);
      if (rect) {
        const { left, right, top, bottom } = rect;
        const key = `${top}-${bottom}`;
        if (map[key]) {
          map[key].left = Math.min(map[key].left, left - baseLeft);
          map[key].right = Math.max(map[key].right, right - baseLeft);
        } else {
          map[key] = new LabelLine(left - baseLeft, right - baseLeft, top - baseTop, bottom - baseTop);
        }
      }
    }
    const lines: Array<LabelLine> = Object.values(map);
    return lines;
  }
  private constructor(
    private left: number,
    private right: number,
    private top: number,
    private bottom: number
  ) {
    super(() => {
      this.left = 0;
      this.right = 0;
      this.top = 0;
      this.bottom = 0;
    });
  }
  getWidth() {
    return this.right - this.left;
  }
  getHeight() {
    return this.bottom - this.top;
  }
  getLeft() {
    return this.left;
  }
  getTop() {
    return this.top;
  }
  isInside(x: number, y: number) {
    if (this.isDestructed) {
      return false;
    }
    return x >= this.left && x <= this.right && y >= this.top && y <= this.bottom;
  }
}

interface TextLabelConfig {
  color?: Color;
  opacity?: number;
  onRelabel?: OnRelabel | null;
}

const DEFAULT_LABEL_COLOR: Color = {
  r: 0, g: 210, b: 255
};

type SelectedStyledDOM = [HTMLDivElement, HTMLDivElement];

export class TextLabel extends Destructable {
  private from: number;
  private to: number;
  private source: TextLabelScope | null = null;
  private labelLines: Array<LabelLine> | null = [];
  private linesDOMCache: Record<string, HTMLDivElement> | null = {};
  private config: Required<TextLabelConfig> = {
    color: DEFAULT_LABEL_COLOR,
    opacity: 0.4,
    onRelabel: null,
  };
  private labelDOM: HTMLDivElement | null = null;
  private root: HTMLElement | null = null;
  private selected: boolean = false;
  private selectStyledDOM: SelectedStyledDOM | null = null;
  private isDraggingStartDOM: boolean = false;
  private isDraggingEndDOM: boolean = false;
  private tempRange: Range | null = null;
  getInnerText() {
    if (this.isDestructed) {
      return '';
    }
    return this.source!.getText(this.from, this.to);
  }
  isInside(x: number, y: number) {
    if (this.isDestructed) {
      return false;
    }
    return this.labelLines!.reduce((isInside, line) => isInside || line.isInside(x, y), false);
  }
  unselect() {
    if (this.isDestructed) {
      return;
    }
    if (!this.selectStyledDOM) {
      return;
    }
    const [startDOM, endDOM] = this.selectStyledDOM;
    startDOM.replaceWith();
    endDOM.replaceWith();
    this.selected = false;
  }
  select() {
    if (this.isDestructed) {
      return;
    }
    if (!this.selectStyledDOM) {
      this.createSelectedDOM();
    }
    const sourceTexts = this.source!.getSource(this.from, this.to);
    const [startText, endText] = [sourceTexts.at(0), sourceTexts.at(-1)];
    const [startDOM, endDOM] = this.selectStyledDOM!;
    console.log(sourceTexts);
    
    startText?.replaceWith(startDOM, startText!);
    endText?.replaceWith(endText!, endDOM);
    this.selected = true;
  }
  isSelected() {
    if (this.isDestructed) {
      return false;
    }
    return this.selected;
  }
  getFrom() {
    return this.from;
  }
  getTo() {
    return this.to;
  }
  getLength() {
    return this.to - this.from;
  }
  isValidTextLabel() {
    if (this.isDestructed) {
      return false;
    }
    return this.labelLines!.length > 0;
  }
  setRange(range: Range) {
    if (this.isDestructed) {
      return;
    }
    const { left: baseLeft, top: baseTop } = this.root!.getBoundingClientRect();
    const labelLines = LabelLine.compileRangeToLines(range, baseLeft, baseTop);
    this.setLabelLines(labelLines);
  }
  setFrom(from: number) {
    if (this.isDestructed) {
      return;
    }
    this.from = from;
  }
  setTo(to: number) {
    if (this.isDestructed) {
      return;
    }
    this.to = to;
  }
  setColor(color: Color) {
    if (this.isDestructed) {
      return;
    }
    this.config.color = color;
    this.rerenderColor();
  }
  setOpacity(opacity: number) {
    if (this.isDestructed) {
      return;
    }
    this.config.opacity = opacity;
    this.rerenderColor();
  }
  getLabelDOM() {
    if (this.isDestructed) {
      return null;
    }
    return this.labelDOM;
  }
  getLabelInfo() {
    if (this.isDestructed) {
      return null;
    }
    return {
      from: this.from,
      to: this.to,
      text: this.getInnerText(),
      length: this.getLength(),
      label: this,
    } as LabelInfo;
  }
  rerender() {
    if (this.isDestructed) {
      return;
    }
    const texts = this.source!.getSource(this.from, this.to);
    const [firstText, lastText] = [texts.at(0), texts.at(-1)];
    const range = new Range();
    range.setStart(firstText!, 0);
    range.setEnd(lastText!, 1);
    this.setRange(range);
  }
  constructor(
    root: HTMLElement,
    source: TextLabelScope,
    config?: TextLabelConfig
  ) {
    super(() => {
      this.root = null;
      this.labelDOM = null;
      this.from = 0;
      this.to = 0;
      this.source = null;
      this.labelLines!.forEach(line => line.destruct());
      this.labelLines = null;
      this.linesDOMCache = null;
      this.selectStyledDOM = null;
      this.config.onRelabel = null;
    });
    this.handleSelectEndDOM = this.handleSelectEndDOM.bind(this);
    this.handleDrag = this.handleDrag.bind(this);
    this.handleDragEnd = this.handleDragEnd.bind(this);
    this.handleSelectStartDOM = this.handleSelectStartDOM.bind(this);
    this.root = root;
    this.source = source;
    this.from = 0;
    this.to = 0;
    Object.assign(this.config, config);
    this.initLabelDOM();
  }
  private setLabelLines(lines: Array<LabelLine>) {
    const cacheKeys = new Set(Object.keys(this.linesDOMCache!));
    this.labelLines = lines;
    this.labelLines.forEach(line => {
      const [top, left, width, height] = [
        line.getTop(),
        line.getLeft(),
        line.getWidth(),
        line.getHeight()
      ];
      const key = `${top}-${height}`;
      let lineDOM: HTMLDivElement;
      if (key in this.linesDOMCache!) {
        lineDOM = this.linesDOMCache![key];
        Object.assign(lineDOM.style, {
          width: `${width}px`,
          left: `${left}px`
        });
        cacheKeys.delete(key);
      } else {
        lineDOM = document.createElement('div');
        Object.assign(lineDOM.style, {
          left: `${left}px`,
          top: `${top}px`,
          width: `${width}px`,
          height: `${height}px`,
          backgroundColor: this.getColorString(),
          position: 'absolute',
        });
        this.linesDOMCache![key] = lineDOM;
        this.labelDOM!.appendChild(lineDOM);
      }
    });
    cacheKeys.forEach(key => {
      this.labelDOM!.removeChild(this.linesDOMCache![key]);
      delete this.linesDOMCache![key];
    });
  }
  private initLabelDOM() {
    const label = document.createElement('div');
    this.labelDOM = label;
    Object.assign(this.labelDOM.style, {
      position: 'absolute',
      left: 0,
      top: 0,
    });
    this.root!.appendChild(label);
    this.addDestructCallback(
      () => {
        this.root!.removeChild(this.labelDOM!);
      }
    );
  }
  private getColorString(opacity = this.config.opacity) {
    const { color } = this.config;
    const { r, g, b } = color;
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  private rerenderColor() {
    Object.values(this.linesDOMCache!).forEach(lineDOM => {
      Object.assign(lineDOM.style, {
        backgroundColor: this.getColorString()
      });
    });
    this.selectStyledDOM?.forEach(selectStyleDOM => {
      Object.assign(selectStyleDOM.style, {
        backgroundColor: this.getColorString(1)
      });
    });
  }
  private getLineHeights() {
    return this.labelLines!.map(line => line.getHeight());
  }
  private createSelectedDOM() {
    const lineHeights = this.getLineHeights();
    const [firstLineHeight, lastLineHeight] = [lineHeights.at(0), lineHeights.at(-1)];
    const startDOM = document.createElement('div');
    const endDOM = document.createElement('div');
    const publicStyle = {
      position: 'relative',
      display: 'inline-block',
      width: '2px',
      top: '0',
      marginRight: '-2px',
      marginTop: '-100%',
      backgroundColor: this.getColorString(1),
      cursor: 'w-resize',
      verticalAlign: 'text-bottom'
    };
    const startStyle = {
      left: '-2px',
      height: `${firstLineHeight}px`,
    };
    const endStyle = {
      left: 0,
      height: `${lastLineHeight}px`,
    };
    startDOM.addEventListener('mousedown', this.handleSelectStartDOM, true);
    endDOM.addEventListener('mousedown', this.handleSelectEndDOM, true);
    document.addEventListener('mousemove', this.handleDrag);
    document.addEventListener('mouseup', this.handleDragEnd, true);
    Object.assign(startDOM.style, publicStyle, startStyle);
    Object.assign(endDOM.style, publicStyle, endStyle);
    this.selectStyledDOM = [startDOM, endDOM];
    this.addDestructCallback(
      () => {
        startDOM.removeEventListener('mousedown', this.handleSelectStartDOM, true);
        endDOM.removeEventListener('mousedown', this.handleSelectEndDOM, true);
        document.removeEventListener('mousemove', this.handleDrag);
        document.removeEventListener('mouseup', this.handleDragEnd, true);
      }
    );
  }
  private handleSelectStartDOM($e: MouseEvent) {
    if ($e.button !== 0) {
      return;
    }
    $e.stopPropagation();
    this.isDraggingStartDOM = true;
    this.unselect();
    this.saveCurrentRange();
  }
  private handleSelectEndDOM($e: MouseEvent) {
    if ($e.button !== 0) {
      return;
    }
    $e.stopPropagation();
    this.isDraggingEndDOM = true;
    this.unselect();
    this.saveCurrentRange();
  }
  private saveCurrentRange() {
    const sources = this.source!.getSource(this.from, this.to);
    const range = new Range();
    const [startNode, endNode] = [sources.at(0), sources.at(-1)];
    range.setStart(startNode!, 0);
    range.setEnd(endNode!, 0);
    this.tempRange = range;
  }
  private handleDrag() {
    if (this.isDraggingEndDOM || this.isDraggingStartDOM) {
      const selection = document.getSelection();
      if (!selection) {
        return;
      }
      const { tempRange } = this;
      const range = selection.getRangeAt(0);
      if (tempRange && this.isDraggingEndDOM) {
        const { startIdx, endIdx, range: mergedRange } = this.mergeRange(range, tempRange, false);
        if (startIdx >= 0 && endIdx >= 0) {
          this.setFrom(startIdx);
          this.setTo(endIdx);
          this.setRange(mergedRange);
        }
      } else if (tempRange && this.isDraggingStartDOM) {
        const { startIdx, endIdx, range: mergedRange } = this.mergeRange(range, tempRange, true);
        if (startIdx >= 0 && endIdx >= 0) {
          this.setFrom(startIdx);
          this.setTo(endIdx);
          this.setRange(mergedRange);
        }
      }
    }
  }
  private mergeRange(to: Range, from: Range, draggingStart = false) {
    const texts = this.source!.getSource();
    const { index: tStartIdx } = this.nodeTrimToText(to.startContainer, texts, true);
    const { index: tEndIdx } = this.nodeTrimToText(to.endContainer, texts, false);
    const { index: fStartIdx } = this.nodeTrimToText(from.startContainer, texts, true);
    const { index: fEndIdx } = this.nodeTrimToText(from.endContainer, texts, false);
    let startIdx: number, endIdx: number;
    if (draggingStart) {
      endIdx = Math.max(fEndIdx, tEndIdx) + 1;
      startIdx = (tEndIdx < fStartIdx) ? tStartIdx : Math.min(tEndIdx, fEndIdx);
    } else {
      startIdx = Math.min(fStartIdx, tStartIdx);
      endIdx = ((tStartIdx > fEndIdx) ? tEndIdx : Math.max(tStartIdx, fStartIdx)) + 1;
    }
    const range = new Range();
    texts[startIdx] && range.setStart(texts[startIdx], 0);
    texts[endIdx] && range.setEnd(texts[endIdx], 0);
    return { startIdx, endIdx, range };
  }
  private nodeTrimToText(node: Node, texts: Array<Text>, forward = true) {
    let textNode: Node = node;
    let textIndex: number = -1;
    while (!this.isTextNode(textNode) || (textIndex = texts.indexOf(textNode)) < 0) {
      if (forward) {
        if (!textNode.nextSibling) {
          break;
        }
        textNode = textNode.nextSibling;
      } else {
        if (!textNode.previousSibling) {
          break;
        }
        textNode = textNode.previousSibling;
      }
    }
    return {
      node: textNode,
      index: textIndex
    };
  }
  private handleDragEnd($e: MouseEvent) {
    if ($e.button !== 0) {
      return;
    }
    if (this.isDraggingEndDOM || this.isDraggingStartDOM) {
      $e.preventDefault();
      document.getSelection()?.removeAllRanges();
      this.select();
      this.config.onRelabel?.(this.getLabelInfo()!);
    }
    this.isDraggingEndDOM = false;
    this.isDraggingStartDOM = false;
  }
  private isTextNode(node: Node): node is Text {
    return node.nodeType === 3;
  }
}

export interface TextLabelScopeConfig {
  color?: Color;
  labelOpacity?: number;
  onLabel?: OnLabel | null;
  onStartLabel?: OnStartLabel | null;
  onRelabel?: OnRelabel | null;
  onSelect?: OnSelect | null;
  onHover?: OnHover | null;
  onDeleteLabel?: OnDeleteLabel | null;
  labelDirectory?: boolean;
  initValue?: Array<InitLabelInfo> | null;
}

interface BasicLabelInfo {
  from: number;
  to: number;
}

export interface InitLabelInfo extends BasicLabelInfo {
  color: Color;
  opacity?: number;
}

export interface LabelInfo extends BasicLabelInfo {
  text: string;
  length: number;
  label: TextLabel;
  labels?: Array<LabelInfo>;
}

interface OnLabel {
  (labelInfo: LabelInfo): void;
}

interface OnStartLabel {
  (): void;
}

interface OnRelabel {
  (labelInfo: LabelInfo): void;
}

interface OnSelect {
  (labelInfo: LabelInfo): void;
}

interface OnHover {
  (labelInfo: LabelInfo): void;
}

interface OnDeleteLabel {
  (labelInfo: LabelInfo): void;
}

export class TextLabelScope extends Destructable {
  private source: Array<Text> | null = [];
  private labels: Array<TextLabel> | null = [];
  private root: HTMLElement | null = null;
  private config: Required<TextLabelScopeConfig> = {
    color: DEFAULT_LABEL_COLOR,
    labelOpacity: 0.4,
    labelDirectory: true,
    onLabel: null,
    onStartLabel: null,
    onSelect: null,
    onRelabel: null,
    onHover: null,
    onDeleteLabel: null,
    initValue: null,
  };
  private isLabeling: boolean = false;
  private tempTextLabel: TextLabel | null = null;
  private labelsContainer: HTMLDivElement | null = null;
  private selectingLabel: TextLabel | null = null;
  private hoveringLabel: TextLabel | null = null;
  getText(from: number, to: number) {
    if (this.isDestructed) {
      return '';
    }
    return this.source!.slice(from, to).map(node => node.textContent).join('');
  }
  getSource(from?: number, to?: number) {
    if (this.isDestructed) {
      return [];
    }
    return this.source!.slice(from, to);
  }
  deleteLabel(label: TextLabel) {
    if (this.isDestructed) {
      return;
    }
    const index = this.labels!.indexOf(label);
    this.labels!.splice(index, 1);
    this.config.onDeleteLabel?.({
      ...label.getLabelInfo()!,
      labels: this.labels!.map(label => label.getLabelInfo()!)
    });
    label.destruct();
  }
  label() {
    if (this.isDestructed) {
      return;
    }
    this.handleEndLabel();
  }
  createLabel(labelInfo: InitLabelInfo) {
    if (this.isDestructed) {
      return null;
    }
    return this.addLabel(labelInfo);
  }
  getTextLabels() {
    if (this.isDestructed) {
      return [];
    }
    return [...this.labels ?? []];
  }
  getSelectingLabel() {
    if (this.isDestructed) {
      return null;
    }
    return this.selectingLabel;
  }
  useColor(color: Color) {
    if (this.isDestructed) {
      return;
    }
    this.config.color = color;
    if (this.tempTextLabel) {
      this.tempTextLabel.setColor(color);
    }
  }
  clearEnv() {
    this.destruct();
  }
  constructor(dom: HTMLElement, config: TextLabelScopeConfig) {
    super(() => {
      this.source = [];
      this.labels!.forEach(label => label.destruct());
      this.labels = null;
      this.root = null;
      this.tempTextLabel = null;
      this.selectingLabel = null;
      this.hoveringLabel = null;
      this.labelsContainer = null;
      this.config.onLabel = null;
      this.config.onStartLabel = null;
      this.config.onRelabel = null;
      this.config.onSelect = null;
      this.config.onHover = null;
      this.config.initValue = null;
    });
    this.handleEndLabel = this.handleEndLabel.bind(this);
    this.handleLabel = this.handleLabel.bind(this);
    this.handleStartLabel = this.handleStartLabel.bind(this);
    this.handleRerender = this.handleRerender.bind(this);
    this.handleFindHover = throttle(this.handleFindHover.bind(this), 100);
    this.root = dom;
    this.source = this.parseNode(dom);
    this.execDocumentEnv();
    this.execRootEnv();
    this.initLabelsContainer();
    Object.assign(this.config, config);
    this.handleInitValue();
  }
  private handleInitValue() {
    const { initValue } = this.config;
    if (!initValue) {
      return;
    }
    initValue.forEach(labelInfo => this.addLabel(labelInfo));
  }
  private addLabel(labelInfo: InitLabelInfo) {
    const { color, opacity = this.config.labelOpacity, from, to } = labelInfo;
    const textLabel = new TextLabel(this.labelsContainer!, this, {
      color: this.config.color,
      opacity: this.config.labelOpacity,
      onRelabel: this.config.onRelabel,
    });
    const range = new Range();
    const texts = this.getSource(from, to);
    const [startNode, endNode] = [texts.at(0), texts.at(-1)];
    range.setStart(startNode!, 0);
    range.setEnd(endNode!, 0);
    textLabel.setFrom(from);
    textLabel.setTo(to);
    textLabel.setRange(range);
    textLabel.setColor(color);
    textLabel.setOpacity(opacity);
    console.log(this.getSource(from, to));
    
    this.labels!.push(textLabel);
    return textLabel;
  }
  private parseNode(node: Node): Array<Text> {
    const source: Array<Text> = [];
    const childNodes: Array<Node> = [];
    node.childNodes.forEach(node => {
      childNodes.push(node);
    });
    childNodes.forEach(node => {
      if (this.isTextNode(node)) {
        source.push(...this.splitTextNode(node));
      } else {
        source.push(...this.parseNode(node));
      }
    });
    return source;
  }
  private splitTextNode(node: Text): Array<Text> {
    if (node.length === 0) {
      return [];
    } else if (node.length === 1) {
      return [node];
    } else {
      const nodes: Array<Text> = [];
      const texts = [...(node.textContent ?? '')];
      while (texts.length > 0) {
        const text = texts.pop()!;
        nodes.push(node.splitText(node.length - text.length));
      }
      return nodes.reverse();
    }
  }
  private isTextNode(node: Node): node is Text {
    return node.nodeType === 3;
  }
  private initLabelsContainer() {
    const container = document.createElement('div');
    this.labelsContainer = container;
    Object.assign(container.style, {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: -1
    });
    this.root!.appendChild(container);
    this.addDestructCallback(
      () => {
        this.root!.removeChild(container);
      }
    );
  }
  private execRootEnv() {
    let style = document.createElement('style');
    style.innerHTML = `
      .text-label-root {
        position: relative;
        z-index: 0;
      }
      .text-label-root::selection {
        background: none;
      }
      .text-label-root *::selection {
        background: none;
      }
    `;
    const hasLabelRootClass = this.root!.classList.contains('text-label-root');
    this.root!.classList.add('text-label-root');
    this.root!.appendChild(style);
    this.root!.addEventListener('mousedown', this.handleStartLabel);
    this.root!.addEventListener('mousemove', this.handleFindHover);
    this.addDestructCallback(
      () => {
        !hasLabelRootClass && this.root!.classList.remove('text-label-root');
        this.root!.removeChild(style);
        this.root!.removeEventListener('mousedown', this.handleStartLabel);
        this.root!.removeEventListener('mousemove', this.handleFindHover);
      }
    );
  }
  private execDocumentEnv() {
    document.addEventListener('selectionchange', this.handleLabel);
    document.addEventListener('mouseup', this.handleEndLabel);
    const trigger = this.addResizeListener(this.root!);
    this.addDestructCallback(
      () => {
        document.removeEventListener('selectionchange', this.handleLabel);
        document.removeEventListener('mouseup', this.handleEndLabel);
        this.clearResizeListener(this.root!, trigger);
      }
    );
  }
  private addResizeListener(dom: HTMLElement) {
    const obj = document.createElement('object');
    Object.assign(obj.style, {
      display: 'block',
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      opacity: 0,
      pointerEvent: 'none',
      zIndex: -1,
    });
    obj.onload = () => {
      if (obj.contentDocument?.defaultView) {
        obj.contentDocument.defaultView.addEventListener('resize', this.handleRerender);
      }
    }
    obj.type = 'text/html';
    dom.appendChild(obj);
    obj.data = 'about:blank';
    return obj;
  }
  private clearResizeListener(dom: HTMLElement, trigger: HTMLObjectElement) {
    if (trigger.contentDocument?.defaultView) {
      trigger.contentDocument.defaultView.removeEventListener('resize', this.handleRerender);
    }
    dom.removeChild(trigger);
  }
  private handleRerender() {
    this.labels!.forEach(label => label.rerender());
    if (this.isLabeling) {
      this.tempTextLabel!.rerender();
    }
  }
  private handleFindHover($e: MouseEvent) {
    const { clientX, clientY } = $e;
    const { left: baseLeft, top: baseTop } = this.root!.getBoundingClientRect();
    const offsetX = clientX - baseLeft;
    const offsetY = clientY - baseTop;
    let targetLabel = this.selectingLabel?.isInside(offsetX, offsetY) ? this.selectingLabel : null;
    targetLabel || (targetLabel = this.labels!.reduce((target: TextLabel | null, label) => {
      if (target === null && label !== this.selectingLabel && label.isInside(offsetX, offsetY)) {
        return label;
      }
      return target;
    }, null));
    if (this.hoveringLabel !== targetLabel && targetLabel !== null) {
      this.config.onHover?.(targetLabel.getLabelInfo()!)
    }
    this.hoveringLabel = targetLabel;
  }
  private handleStartLabel($e: MouseEvent) {
    if ($e.button !== 0) {
      return;
    }
    this.clearSelection();
    this.labels!.forEach(label => label.unselect());
    if (!this.isLabeling) {
      this.tempTextLabel = new TextLabel(this.labelsContainer!, this, {
        color: this.config.color,
        opacity: this.config.labelOpacity,
        onRelabel: this.config.onRelabel,
      });
      this.config.onStartLabel?.();
    }
    this.isLabeling = true;
  }
  private handleEndLabel($e?: MouseEvent) {
    if ($e && $e.button !== 0) {
      return;
    }
    if (!this.isLabeling) {
      document.getSelection()?.removeAllRanges();
      return;
    }
    const isValidTextLabel = this.tempTextLabel!.isValidTextLabel();
    if ($e && !isValidTextLabel) {
      const { clientX, clientY } = $e;
      const { left: baseLeft, top: baseTop } = this.root!.getBoundingClientRect();
      const offsetX = clientX - baseLeft;
      const offsetY = clientY - baseTop;
      const hitLabels: Array<TextLabel> = this.labels!.filter(label => label.isInside(offsetX, offsetY));
      let hitIndex: number;
      if (this.selectingLabel && (hitIndex = hitLabels.indexOf(this.selectingLabel)) > -1) {
        this.selectingLabel = hitLabels[(hitIndex + 1) % hitLabels.length];
      } else {
        this.selectingLabel = hitLabels[0];
      }
      if (this.selectingLabel) {
        this.selectingLabel.select();
        this.config.onSelect?.(this.selectingLabel.getLabelInfo()!);
      }
      this.isLabeling = false;
    }
    if (!isValidTextLabel) {
      this.tempTextLabel?.destruct();
      this.tempTextLabel = null;
    }
    if ($e && !this.config.labelDirectory || !isValidTextLabel) {
      return;
    }
    this.labels!.push(this.tempTextLabel!);
    this.config.onLabel?.({
      ...this.tempTextLabel!.getLabelInfo()!,
      labels: this.labels!.map(label => label.getLabelInfo()!),
    });
    this.selectingLabel = this.tempTextLabel;
    this.selectingLabel!.select();
    this.tempTextLabel = null;
    this.isLabeling = false;
  }
  private handleLabel() {
    if (!this.isLabeling) {
      return;
    }
    const selection = document.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const { startContainer, endContainer } = range;
      let startNode: Node = startContainer;
      let startIndex: number;
      while (!this.isTextNode(startNode) || (startIndex = this.source!.indexOf(startNode)) < 0) {
        if (!startNode.nextSibling) {
          break;
        }
        startNode = startNode.nextSibling;
      }
      let endNode: Node = endContainer;
      let endIndex: number;
      while (!this.isTextNode(endNode) || (endIndex = this.source!.indexOf(endNode)) < 0) {
        if (!endNode.previousSibling) {
          break;
        }
        endNode = endNode.previousSibling;
      }
      const textLabel = this.tempTextLabel!;
      if (startIndex! < 0 || endIndex! < 0) {
        return;
      }
      textLabel.setFrom(startIndex!);
      textLabel.setTo(endIndex! + 1);
      textLabel.setRange(range);
    }
  }
  private clearSelection() {
    const selection = document.getSelection();
    if (selection) {
      selection.empty();
    }
  }
}