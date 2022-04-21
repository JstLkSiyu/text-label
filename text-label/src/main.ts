import './style.css'
import { TextLabelScope } from './text-label';

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  <h1>Hello Text Label!</h1>
  <div id='inject' style='text-align: center'>
  <h3>@siyu/text-label</h3>
  <p>这是一个为文本标签提供划词高亮能力的组件，支持react😄😄</p>
  <pre style='text-align: left; display: inline-block'>
  const text = document.getElementById("text");
  const scope = new TextLabelScope(text, {
      onLabel: info => {
          //划词结束回调
      },
      onRelabel: info => {
          //修改左右边界回调
      },
      onSelect: info => {
          //选中标注回调
      },
      onStartLabel: () => {
          //开始划词回调
      },
      color: '',//初始划词标注颜色
      labelOpacity: 0.7,//初始划词标注透明度
      labelDirectory: true,//是否直接标注
      initValue: [],//标注初始值
  });
  </pre>
  </div>
  <div>
    <form name='color'>
      <input type='radio' name='color' value='red' />
      <span>red</span>
      <input type='radio' name='color' value='green' />
      <span>green</span>
      <input type='radio' name='color' value='aqua' checked />
      <span>aqua</span>
    </form>
  </div>
  <button id='label-btn'>click</button>
`

const inject = app.querySelector('#inject');
const labelBtn = app.querySelector('#label-btn');
const manager = inject ? new TextLabelScope(inject as HTMLElement, {
  onLabel: info => {
    console.log('label', info);
  },
  onRelabel: info => {
    console.log('relabel', info);
  },
  onSelect: info => {
    console.log('select', info);
  },
  onHover: info => {
    console.log('hover', info);
  },

  labelDirectory: true,
  initValue: [{
    color: { r: 255, g: 196, b: 203 },
    from: 10,
    to: 40
  }]
}): null;

labelBtn!.addEventListener('click', () => {
  manager!.label();
});

type Color = {
  r: number;
  g: number;
  b: number;
};

const colors: Record<string, Color> = {
  red: { r: 255, g: 190, b: 170 },
  green: { r: 0, g: 255, b: 210 },
  aqua: { r: 0, g: 210, b: 255 },
};

let currentColor = colors['aqua'];

const colorForm = app.querySelector('form[name="color"]');
colorForm?.addEventListener('change', ($e: Event) => {
  const value = ($e.target as HTMLInputElement)!.value;
  currentColor = colors[value];
  manager?.useColor(currentColor);
  manager?.getSelectingLabel()?.setColor(currentColor);
});