import GridSystem from "./GridSystem";
import Orb from "./Orb";

const { ccclass, property } = cc._decorator;

export enum EventType {
    ORB_PICK = "ORB_PICK",
    ORB_MOVE = "ORB_MOVE",
    ORB_MATCH = "ORB_MATCH",
    ORB_SWITCH = "ORB_SWITCH",
    ORB_DROP = "ORB_DROP",
    TRIGGER_ENTER = "TRIGGER_ENTER",
}
export enum OrbType {
    NONE,
    WATER,
    FIRE,
    WOOD,
    LIGHT,
    DARK,
    HEAL,
}
export const OrbColor = {
    [OrbType.NONE]: cc.Color.WHITE,
    [OrbType.WATER]: cc.color(100, 150, 255),
    [OrbType.FIRE]: cc.color(230, 100, 100),
    [OrbType.WOOD]: cc.color(100, 200, 100),
    [OrbType.HEAL]: cc.color(255, 140, 170),
    [OrbType.LIGHT]: cc.color(250, 250, 100),
    [OrbType.DARK]: cc.color(170, 60, 255),
};
export const OrbString = {
    [OrbType.NONE]: "無",
    [OrbType.WATER]: "水",
    [OrbType.FIRE]: "火",
    [OrbType.WOOD]: "木",
    [OrbType.HEAL]: "心",
    [OrbType.LIGHT]: "光",
    [OrbType.DARK]: "暗"
};
@ccclass
export default class BOARD extends cc.Component {

    @property(cc.Node)
    orbPrefab: cc.Node = null;
    @property(cc.Node)
    gridNode: cc.Node = null;
    @property(cc.Node)
    blockNode: cc.Node = null;
    @property(cc.CircleCollider)
    trigger: cc.CircleCollider = null;

    @property
    gap: number = 10;
    @property
    gridCol: number = 6;
    @property
    gridRow: number = 5;

    private _grid: GridSystem = GridSystem.instance;
    private _passedOrbs: Orb[] = [];

    // LIFE-CYCLE CALLBACKS:

    // onLoad () {}

    start() {
        this.initGrid();
        cc.director.getCollisionManager().enabled = true;
        cc.director.getCollisionManager().enabledDebugDraw = true;
        cc.systemEvent.on(EventType.ORB_SWITCH, this.onOrbSwitch, this);
        cc.systemEvent.on(EventType.ORB_MATCH, this.onOrbMatch, this);
        cc.systemEvent.on(EventType.ORB_PICK, this.onOrbPick, this);
    }

    // update (dt) {}

    protected onDestroy(): void {
        cc.systemEvent.off(EventType.ORB_SWITCH, this.onOrbSwitch, this);
        cc.systemEvent.off(EventType.ORB_MATCH, this.onOrbMatch, this);
        cc.systemEvent.off(EventType.ORB_PICK, this.onOrbPick, this);
    }

    /** 初始化網格 */
    public initGrid() {
        let gridSize = cc.v2(this.gridCol, this.gridRow);
        let ordSize = cc.v2(this.orbPrefab.width, this.orbPrefab.height);
        let gap = this.gap;
        this._grid.init(gridSize, ordSize, gap);

        for (let col = 0; col < gridSize.x; col++) {
            for (let row = 0; row < gridSize.y; row++) {
                // 生成圖標
                const orbNode = cc.instantiate(this.orbPrefab);
                const orbItem = orbNode.getComponent(Orb);

                orbItem.getComponent(cc.CircleCollider).radius = this.orbPrefab.width / 3;
                orbNode.setParent(this.gridNode);
                orbNode.setPosition(this._grid.getPos(cc.v2(col, row)));

                const type = [OrbType.WATER, OrbType.FIRE, OrbType.WOOD, OrbType.LIGHT, OrbType.DARK, OrbType.HEAL][Math.floor(Math.random() * 6)];
                orbItem.init(cc.v2(col, row), type);

                this._grid.insertItem(cc.v2(col, row), orbItem);

                // 生成觸發器
                const trigger = cc.instantiate(this.trigger.node).getComponent(cc.CircleCollider);
                trigger.node.setParent(this.gridNode);
                trigger.node.setPosition(this._grid.getPos(cc.v2(col, row)));
                trigger.radius = this.orbPrefab.width / 3;
            }
        }
    }

    public init() {
        const blockWidth = this.orbPrefab.width * this.gridCol + this.gap * (this.gridCol - 1);
        const blockHeight = this.orbPrefab.height * this.gridRow + this.gap * (this.gridRow - 1);
        this.blockNode.setContentSize(cc.size(blockWidth, blockHeight));
        this.blockNode.setPosition(cc.v2(blockWidth / 2, blockHeight / 2));
        this.blockNode.active = false;
    }

    private onOrbPick(orb: Orb) {
        this._passedOrbs.push(orb);
    }
    /** 監聽圖標互換 */
    private onOrbSwitch(mainCoord: cc.Vec2, targetCoord: cc.Vec2) {
        cc.warn(`onOrbExchange: [${mainCoord.x}, ${mainCoord.y}] => [${targetCoord.x}, ${targetCoord.y}]`);
        const targetItem = this._grid.getItem(targetCoord);
        const mainItem = this._grid.getItem(mainCoord);

        this._passedOrbs.push(targetItem);
        this._grid.switchItem(mainCoord, targetCoord);
        mainItem.setCoord(targetCoord);
        targetItem.setCoord(mainCoord);
        targetItem.playSwtichAni(true);
    }

    /** 監聽圖標消除 */
    private async onOrbMatch() {
        const match3List = [] as Orb[];
        const dropList: Orb[][] = [];
        this._passedOrbs.forEach(orb => {
            cc.warn(`passedOrb: [${orb.coord.x}, ${orb.coord.y}]`);
            match3List.push(...this._grid.getMatch3List(orb.coord));
        });
        this._passedOrbs.length = 0;

        // 消除動畫
        match3List.sort((a, b) => a.coord.y - b.coord.y); // y軸由大到小，由下往上消除
        await Promise.all(match3List.map(orb => orb.playWinEffect()));

        // 消除的圖標移動到畫面外上方
        const winCount: number[] = []; // 該行消除的圖標計數
        match3List.forEach(winOrb => {
            const { x } = winOrb.coord;
            winCount[x] = winCount[x] ? winCount[x] + 1 : 1;
            winOrb.node.y = winOrb.node.height * winCount[x];
        });

        // 處理網格座標
        match3List.forEach(originOrb => {
            const { x: originX, y: originY } = originOrb.coord;
            dropList[originX] = dropList[originX] ? dropList[originX] : [];
            for (let curY = originY - 1; curY >= 0; curY--) {
                const curOrb = this._grid.getItem(cc.v2(originX, curY));
                if (!dropList[originX].includes(curOrb) && !curOrb.isMatch) {
                    dropList[originX].push(curOrb);
                }
                curOrb.setCoord(cc.v2(originX, curY + 1));
                this._grid.insertItem(cc.v2(originX, curY + 1), curOrb);
            }
            if (!dropList[originX].includes(originOrb)) {
                dropList[originX].push(originOrb);
            }
            originOrb.setCoord(cc.v2(originX, 0));
            this._grid.insertItem(cc.v2(originX, 0), originOrb);
        });


        // 掉落動畫
        const dropingTween: Promise<void>[] = [];
        dropList.forEach((dropOrbs) => {
            dropOrbs.forEach((dropOrb, dropCount) => {
                const raito = dropCount / dropOrbs.length;
                this._passedOrbs.push(dropOrb);
                dropingTween.push(dropOrb.playDropAni(raito));
            });
        });

        match3List.forEach(orb => {
            orb.setType();
            orb.isMatch = false;
        });

        await Promise.all(dropingTween);
        if (match3List.length > 0) this.onOrbMatch();
    }
}
