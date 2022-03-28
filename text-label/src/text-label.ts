interface Color {
  r: number;
  g: number;
  b: number;
}

abstract class Desctructable {
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

class LabelLine extends Desctructable {
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

class TextLabel extends Desctructable {
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
    const [startDOM, endDOM] = this.selectStyledDOM!;
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
      this.config.onRelabel?.({
        text: this.getInnerText(),
        from: this.getFrom(),
        to: this.getTo(),
        length: this.getLength(),
        label: this
      });
    }
    this.isDraggingEndDOM = false;
    this.isDraggingStartDOM = false;
  }
  private isTextNode(node: Node): node is Text {
    return node.nodeType === 3;
  }
}

interface TextLabelScopeConfig {
  color?: Color;
  labelOpacity?: number;
  onLabel?: OnLabel | null;
  onStartLabel?: OnStartLabel | null;
  onRelabel?: OnRelabel | null;
  onSelect?: OnSelect | null;
  labelDirectory?: boolean;
}

interface LabelInfo {
  text: string;
  from: number;
  to: number;
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

export class TextLabelScope extends Desctructable {
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
  };
  private isLabeling: boolean = false;
  private tempTextLabel: TextLabel | null = null;
  private labelsContainer: HTMLDivElement | null = null;
  private selectingLabel: TextLabel | null = null;
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
    label.destruct();
    this.labels!.splice(index, 1);
  }
  label() {
    if (this.isDestructed) {
      return;
    }
    this.handleEndLabel();
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
      this.labelsContainer = null;
      this.config.onLabel = null;
      this.config.onStartLabel = null;
      this.config.onRelabel = null;
      this.config.onSelect = null;
    });
    this.handleEndLabel = this.handleEndLabel.bind(this);
    this.handleLabel = this.handleLabel.bind(this);
    this.handleStartLabel = this.handleStartLabel.bind(this);
    this.root = dom;
    this.source = this.parseNode(dom);
    this.execDocumentEnv();
    this.execRootEnv();
    this.initLabelsContainer();
    Object.assign(this.config, config);
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
      while (node.length > 1) {
        nodes.push(node.splitText(node.length - 1));
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
    this.addDestructCallback(
      () => {
        !hasLabelRootClass && this.root!.classList.remove('text-label-root');
        this.root!.removeChild(style);
        this.root!.removeEventListener('mousedown', this.handleStartLabel);
      }
    );
  }
  private execDocumentEnv() {
    document.addEventListener('selectionchange', this.handleLabel);
    document.addEventListener('mouseup', this.handleEndLabel);
    this.addDestructCallback(
      () => {
        document.removeEventListener('selectionchange', this.handleLabel);
        document.removeEventListener('mouseup', this.handleEndLabel);
      }
    );
  }
  private handleStartLabel($e: MouseEvent) {
    if ($e.button !== 0) {
      return;
    }
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
    document.getSelection()?.removeAllRanges();
    if (!this.isLabeling) {
      return;
    }
    const isValidTextLabel = this.tempTextLabel!.isValidTextLabel();
    if ($e && !isValidTextLabel) {
      const { offsetX, offsetY } = $e;
      const hitLabels: Array<TextLabel> = this.labels!.filter(label => label.isInside(offsetX, offsetY));
      let hitIndex: number;
      if (this.selectingLabel && (hitIndex = hitLabels.indexOf(this.selectingLabel)) > -1) {
        this.selectingLabel = hitLabels[(hitIndex + 1) % hitLabels.length];
      } else {
        this.selectingLabel = hitLabels[0];
      }
      if (this.selectingLabel) {
        this.selectingLabel.select();
        this.config.onSelect?.({
          text: this.selectingLabel.getInnerText(),
          from: this.selectingLabel.getFrom(),
          to: this.selectingLabel.getTo(),
          length: this.selectingLabel.getLength(),
          label: this.selectingLabel
        });
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
      text: this.tempTextLabel!.getInnerText(),
      from: this.tempTextLabel!.getFrom(),
      to: this.tempTextLabel!.getTo(),
      length: this.tempTextLabel!.getLength(),
      label: this.tempTextLabel!,
      labels: this.labels!.map(label => ({
        text: label.getInnerText(),
        from: label.getFrom(),
        to: label.getTo(),
        length: label.getLength(),
        label,
      })),
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
}