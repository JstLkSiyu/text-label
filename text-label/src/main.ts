import './style.css'
import { TextLabelScope } from './text-label';

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  <h1>Hello Text Label!</h1>
  <p id='inject'>
  Vanilla 支持的选项都提供了默认值，如果你的环境与默认值不一样，请configure时指定成你自己的。

  特别注意选项--openresty-path，默认为/usr/local/openresty，请确保设置正确。
  
  可以在源码目录下执行configure --help来查看安装选项的使用方法。
  
  下面是一个简单的安装示例：
  
  ./configure --prefix=/usr/local/vanilla --openresty-path=/usr/local/openresty
  
  make install （如果没有C模块【目前支持lua-filesystem】，则不需要make，直接make install）
  luarocks install安装须知
  可以使用luarocks安装vanilla，但是下面三点请注意 1. Luarocks应该基于lua5.1.x的版本安装，因为其他版本Lua和Luajit的ABI存在兼容性问题。 2. Luarocks安装的Vanilla在nginx.conf文件的NGX_PATH变量不可用。 3. 请确保nginx命令可以直接运行（nginx命令在你的环境变量中）
  
  Vanilla 使用
  Vanilla命令
  Vanilla 目前提供了两个命令vanilla，和vanilla-console
  
  vanilla用来初始化应用骨架，停启服务（添加--trace参数可以看到执行的命令）
  
  vanilla-console是一个交互式命令行，主要提供一种方便学习Lua入门的工具，可以使用一些vanilla开发环境下的包，比如table输出的lprint_r方法。
  
  命令行执行vanilla就能清晰看到vanilla命令提供的选项。
  
  vanilla
  Vanilla v0.1.0-rc3, A MVC web framework for Lua powered by OpenResty.
  
  Usage: vanilla COMMAND [ARGS] [OPTIONS]
  
  The available vanilla commands are:
   new [name]             Create a new Vanilla application
   start                  Starts the Vanilla server
   stop                   Stops the Vanilla server
  
  Options:
   --trace                Shows additional logs
  创建应用
  vanilla new app_name
  cd app_name
  vanilla start [--trace]     -- 默认运行在development环境
  
  ## 在linux的bash环境下：
  VA_ENV=production vanilla start [--trace]  -- 运行在生产环境
  ## 在BSD等tcsh环境下：
  setenv VA_ENV production;vanilla start [--trace]  -- 运行在生产环境
  代码目录结构
  <b>
  hello world
  </b>
  </p>
  <button id='label-btn'>click</button>
`

const inject = app.querySelector('#inject');
const labelBtn = app.querySelector('#label-btn');
const manager = inject ? new TextLabelScope(inject as HTMLElement, {
  onLabel: info => {
    console.log(info);
  },
  labelDirectory: false
}): null;

labelBtn!.addEventListener('click', () => {
  manager!.label();
});