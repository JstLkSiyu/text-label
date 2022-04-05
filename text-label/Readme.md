### @siyu/text-label

这是一个为文本标签提供划词高亮能力的组件，支持react

```js
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
```

![image-20220406014444567](D:\Project\NodeJS\@siyu\text-label\text-label\images\Readme\image-20220406014444567.png)