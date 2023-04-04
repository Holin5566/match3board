import { EventType, OrbColor, OrbString, OrbType } from "./Board";
import GridSystem from "./GridSystem";

const { ccclass, property } = cc._decorator;

@ccclass
export default class Orb extends cc.Component {

    @property(cc.Graphics)
    graphics: cc.Graphics = null;

    @property(cc.Label)
    label: cc.Label = null;

    public isMatch: boolean = false;

    private _coord: cc.Vec2 = null;
    public get coord(): cc.Vec2 { return cc.v2(this._coord); }
    // public get coordStr(): string { return `${this._coord.x}-${this._coord.y}`; }
    public get coordStr(): string { return OrbString[this._type]; }

    private _type: OrbType = null;
    public get type(): OrbType { return this._type; }

    private _gap: number = 10;
    private _coordBeforMove: cc.Vec2 = null;
    private _posBeforMove: cc.Vec2 = null;
    private _isMoving: boolean = false;
    private _isPlaying: boolean = false;
    private _isDragging: boolean = false;
    // LIFE-CYCLE CALLBACKS:

    // onLoad () {}

    start() {

    }

    // update (dt) {}

    onDestroy() {
        this.node.off(cc.Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.off(cc.Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.off(cc.Node.EventType.TOUCH_END, this.onTouchEnd, this);
    }

    /** 初始化 */
    public init(coord: cc.Vec2, type: OrbType) {
        this._coord = coord;
        this.graphics.clear();
        this.graphics.circle(0, 0, this.node.height / 2);
        this.setType(type);

        // 綁定觸摸事件
        this.node.on(cc.Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(cc.Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(cc.Node.EventType.TOUCH_END, this.onTouchEnd, this);
    }

    /** 交換圖標動畫 */
    public playSwtichAni(doTween: boolean = true) {
        this.node.setSiblingIndex(999);
        return new Promise((resolve, reject) => {
            if (doTween) {
                this._isMoving = true;
                cc.tween(this.node)
                    .to(0.1, { position: cc.v3(GridSystem.instance.getPos(this.coord)) }, { easing: cc.easing.quadOut })
                    .call(resolve)
                    .call(() => this._isMoving = false)
                    .start();
            } else {
                this.node.setPosition(GridSystem.instance.getPos(this.coord));
            }
        })
    }

    // 掉落動畫
    public async playDropAni(raito: number): Promise<void> {
        this.node.active = true;
        const base = 0.3;
        const duration = 0.5;
        const before = duration * raito;
        const during = duration - before + base;
        return new Promise((resolve, reject) => {
            this._isMoving = true;
            cc.tween(this.node)
                .delay(before)
                .to(during, { position: cc.v3(GridSystem.instance.getPos(this._coord)) }, { easing: cc.easing.quadOut })
                .call(() => this._isMoving = false)
                .call(resolve)
                .start();
        });
    }
    /** 設置屬性 */
    public setType(type?: OrbType) {
        if (!type) {
            this._type = [OrbType.WATER, OrbType.FIRE, OrbType.WOOD, OrbType.LIGHT, OrbType.DARK, OrbType.HEAL][Math.floor(Math.random() * 6)];
        } else {
            this._type = type;
        }
        this.graphics.fillColor = OrbColor[this._type];
        this.graphics.fill();
        this.label.string = this.coordStr;
    }

    /** 設置座標 */
    public setCoord(coord: cc.Vec2) {
        this._coord = coord;
    }

    /** 播放勝利特效 */
    public async playWinEffect() {
        if (this._isPlaying) {
            return;
        }
        this._isPlaying = true;
        return new Promise((resolve, reject) => {
            cc.tween(this.node)
                .to(0.2, { scale: 1.2 }, { easing: cc.easing.quartOut })
                .to(0.5, { scale: 0, opacity: 0 }, { easing: cc.easing.quadOut })
                .call(() => {
                    this.node.active = false;
                    this.node.scale = 1;
                    this.node.opacity = 255;
                    this._isPlaying = false;
                    resolve(null);
                })
                .start();
        });
    }

    /** 監聽點擊開始 */
    public onTouchStart(e: cc.Touch) {
        console.log(`onTouchStart: [${this._coord.x}, ${this._coord.y}]`);
        this._posBeforMove = this.node.getPosition();
        this._coordBeforMove = this._coord;
        this._isDragging = true;

        cc.systemEvent.emit(EventType.ORB_PICK, this);
    }

    /** 監聽點擊移動 */
    public onTouchMove(e: cc.Touch) {
        const delta = e.getDelta();
        const pos = this.node.getPosition();
        this.node.setPosition(pos.add(delta));
        this.node.setSiblingIndex(1000);
    }

    public onCollisionEnter(other: cc.Collider, self: cc.Collider) {
        if (other.getComponent(Orb)) {
            // 碰撞到其他 Orb 不動作
            return;
        }
        if (!this._isDragging) {
            // 拖曳中才會觸發交換
            return;
        }

        const targetCoord = GridSystem.instance.getCoord(cc.v2(other.node.position));
        cc.systemEvent.emit(EventType.ORB_SWITCH, this._coord, targetCoord);
    }

    /** 監聽點擊結束 */
    public onTouchEnd(e: cc.Touch) {
        console.log("onTouchEnd", this._coord);

        this.node.setPosition(GridSystem.instance.getPos(this._coord));
        this._posBeforMove = null;
        this._coordBeforMove = null;
        this._isDragging = false;

        cc.systemEvent.emit(EventType.ORB_MATCH, e, this);
    }
}
