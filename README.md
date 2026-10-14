# 风铃溪谷 / Windbell Valley

一个温暖手绘的可漫游村庄。沿着村道，经过林间车站、麦香面包房、风铃广场、溪上石桥与向日葵坡。

**在线游览：https://hubery1003-alt.github.io/windbell-valley/**

![风铃溪谷全幅原画](assets/valley-panorama.png)

## 操作

- 方向键 / WASD：沿村道行走；上下微调道路内的位置。
- Shift：快步走。点击画面：沿村道自动前往。
- E / 点击人物：与附近村民聊天。
- “随风漫游”：自动往返游览；再次点击停止。
- 小地图：选择五个地点之一，角色沿路步行前往。
- “全景” / − / ＋：查看整个村庄或调整视野。
- “晴日 / 黄昏 / 星夜”：切换气氛。
- “开启声音”：播放原创配乐、溪声与风铃；默认静音。
- 手机：使用画面内的左右按钮与“聊”按钮。

小禾是可控制的旅人。茶婆婆、邮差阿岚、橘猫麦粒与它的朋友松果在村道上活动。地点走访记录只保存于浏览器本地。

## 素材与场景组织

- 原创背景：`assets/valley-panorama.png`，2172 × 724，ImageGen 内置工具生成。
- 原创角色：`assets/characters.png`，1536 × 1024，真实 Alpha，4 行 × 4 帧；旅人、茶婆婆、邮差、橘猫。
- 图集：`assets/animation-manifest.json` 保存源矩形、帧率与方向规则。运行时按 Alpha 边界读取每帧，不依赖不透明色键。
- 世界：7200 × 2400 逻辑单位。原画按比例绘入，不代表原画具有 7200 像素细节。
- 图层：背景 → 水车辐条 / 溪流闪光 / 风铃 → 地面投影 → 按脚点排序的演员 → 桥栏前景遮挡 → 时间色层与窗光 → 烟、蝴蝶、落叶或萤火虫 → 网页控件。
- 行走动作使用 4 帧循环，左向通过镜像获得；停留使用轻微呼吸动作。没有调用视频生成模型。
- 角色路线经过拱桥，前景桥栏遮挡脚部。探索范围是连贯的横向村道及道路宽度内的移动。
- 零运行时 JS 依赖，无后端；Canvas 2D、HTML、CSS、Web Audio。字体、图像与音频全部本地托管。
- 尊重减少动态效果设置；页面进入后台时暂停声音与更新；浏览器自动播放限制由用户手动开启声音处理。

视觉组织参考 [aldegad/sprite-gen 的 village-scene.gif](https://github.com/aldegad/sprite-gen/blob/main/docs/assets/village-scene.gif)：横向村街、背景建筑、远山与独立前景演员。原参考未被复制到本项目，背景、角色、动作和配乐均为新制作。

完整生成提示词在 `assets/generation-prompts.json`。素材生成使用内置 ImageGen；没有使用图像 API CLI 或额外 API 密钥。

## 原创配乐

**《风经过茶屋 / A Breeze at the Teahouse》**：73.85 秒，G 大调，6/8，78 BPM。原创旋律与和声，以加法合成的柔和钢琴、笛声、低音铺底和玻璃铃组成。溪流为独立生成的氛围音轨；实时风铃用 Web Audio 合成。

`assets/music-score.json` 保存乐谱和音色信息。`tools/compose-music.mjs` 可重建 WAV：

```sh
node tools/compose-music.mjs
ffmpeg -i assets/windbell-valley.wav -codec:a libmp3lame -b:a 160k assets/windbell-valley.mp3
ffmpeg -i assets/creek.wav -codec:a libmp3lame -b:a 96k assets/creek.mp3
```

音乐为程序作曲与本地合成，没有使用现有影视音乐或外部音乐生成服务。

## 本地预览与 GitHub Pages

```sh
python3 -m http.server 4173
```

浏览 `http://localhost:4173`。由于 JS 模块和图像读取，推荐通过 HTTP 服务器浏览。

GitHub Pages 发布来源：`main` 分支根目录。`.nojekyll` 禁用 Jekyll；所有资源引用使用相对路径，支持项目子路径。

## 权利说明

本项目未指定代码、美术或音乐的开源许可。Noto Serif SC 子集字体按 SIL Open Font License 1.1 使用，原许可见 `assets/FONT-LICENSE.txt`。
