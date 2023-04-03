import { EventType, OrbType } from "./Board";
import GridSystem from "./GridSystem";

const { ccclass, property } = cc._decorator;

@ccclass
export default class Orb extends cc.Component {

    @property(sp.Skeleton)
    spine: sp.Skeleton = null;

    @property(cc.Label)
    label: cc.Label = null;

    public isMatch: boolean = false;

    private _coord: cc.Vec2 = null;
    public get coord(): cc.Vec2 { return this._coord; }
    public get coordStr(): string { return `${this._coord.x}-${this._coord.y}`; }

    private _type: OrbType = null;
    public get type(): OrbType { return this._type; }

    private _gap: number = 10;
    private _coordBeforMove: cc.Vec2 = null;
    private _posBeforMove: cc.Vec2 = null;
    private _isMoving: boolean = false;
    private _isPlaying: boolean = false;
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
        this.setType(type);

        // 綁定觸摸事件
        this.node.on(cc.Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(cc.Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(cc.Node.EventType.TOUCH_END, this.onTouchEnd, this);
    }

    /** 轉移圖標 */
    public transformTo(coord: cc.Vec2, doTween: boolean = true) {
        this.node.setSiblingIndex(999);
        this._coord = coord;
        // this.node.setPosition(GridSystem.instance.getPos(coord));
        return new Promise((resolve, reject) => {
            if (doTween) {
                cc.tween(this.node)
                    .to(0.2, { position: cc.v3(GridSystem.instance.getPos(coord)) }, { easing: cc.easing.quadOut })
                    .call(resolve)
                    .start();
            } else {
                this.node.setPosition(GridSystem.instance.getPos(coord));
            }
        })
    }

    // 掉落動畫 (根據自身座標掉落，使用前先設定到對應座標)
    public async drop(raito: number): Promise<void> {
        const base = 0.3;
        const duration = 0.5;
        const before = duration * raito;
        const during = duration - before + base;
        return new Promise((resolve, reject) => {
            cc.tween(this.node)
                .delay(before)
                .to(during, { position: cc.v3(GridSystem.instance.getPos(this._coord)) }, { easing: cc.easing.quadOut })
                .call(resolve)
                .start();
        });
    }
    /** 設置屬性 */
    public setType(type?: OrbType) {
        if (!type) {
            this._type = [OrbType.H1, OrbType.H2, OrbType.N1, OrbType.N2, OrbType.N3, OrbType.N4][Math.floor(Math.random() * 6)];
        } else {
            this._type = type;
        }
        this.spine.setAnimation(0, `${this._type}_play_normal`, true);
        this.label.string = `${this._coord.x} - ${this._coord.y}`;
    }

    /** 設置座標 */
    public setCoord(coord: cc.Vec2) {
        this._coord = coord;
        this.label.string = `${coord.x} - ${coord.y}`;
    }

    /** 播放勝利特效 */
    public async playWinEffect() {
        if (this._isPlaying) {
            return;
        }
        this._isPlaying = true;
        return new Promise((resolve, reject) => {
            this.spine.setAnimation(0, `${this._type}_play_win`, false);
            cc.error(`${this._coord.y} - ${this._coord.x}`);
            this.spine.setCompleteListener(() => {
                this.spine.setCompleteListener(null);
                this._isPlaying = false;
                resolve("");
            });
        });
    }

    /** 監聽點擊開始 */
    public onTouchStart(e: cc.Touch) {
        console.log(`onTouchStart: [${this._coord.x}, ${this._coord.y}]`);
        this._posBeforMove = this.node.getPosition();
        this._coordBeforMove = this._coord;

        cc.systemEvent.emit(EventType.ORB_PICK, this);
    }

    /** 監聽點擊移動 */
    public onTouchMove(e: cc.Touch) {
        const delta = e.getDelta();
        const pos = this.node.getPosition();
        this.node.setPosition(pos.add(delta));
        this.node.setSiblingIndex(1000);

        const { x, y } = GridSystem.instance.getCoord(cc.v2(this.node.position));

        cc.systemEvent.emit(EventType.ORB_MOVE, e);
        if (GridSystem.instance.isOverSize(cc.v2(x, y))) {
            return;
        }
        if (x !== this._coord.x || y !== this._coord.y) {
            cc.systemEvent.emit(EventType.ORB_EXCHANGE, this._coord, cc.v2(x, y));
        }
    }

    /** 監聽點擊結束 */
    public onTouchEnd(e: cc.Touch) {
        console.log("onTouchEnd", this._coord);

        this.node.setPosition(GridSystem.instance.getPos(this._coord));
        this._posBeforMove = null;
        this._coordBeforMove = null;

        cc.systemEvent.emit(EventType.ORB_MATCH, e, this);
    }
}
