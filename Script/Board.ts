import GridSystem from "./GridSystem";
import Orb from "./Orb";

const {ccclass, property} = cc._decorator;

export enum EventType {
    ORB_PICK = "ORB_PICK",
    ORB_MOVE = "ORB_MOVE",
    ORB_MATCH = "ORB_MATCH",
    ORB_EXCHANGE = "ORB_EXCHANGE",
    ORB_DROP = "ORB_DROP"
}
export enum OrbType {
    NONE = "NONE",
    H1 = "H1",
    H2 = "H2",
    N1 = "N1",
    N2 = "N2",
    N3 = "N3",
    N4 = "N4",
}

@ccclass
export default class Board extends cc.Component {

    @property(cc.Node)
    orbPrefab: cc.Node = null;
    @property(cc.Node)
    gridNode: cc.Node = null;
    @property(cc.Node)
    blockNode: cc.Node = null;

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

    start () {
        this.initGrid();

        cc.systemEvent.on(EventType.ORB_EXCHANGE, this.onOrbExchange, this);
        cc.systemEvent.on(EventType.ORB_MATCH, this.onOrbMatch, this);
        cc.systemEvent.on(EventType.ORB_DROP, this.onOrbDrop, this);
    }

    // update (dt) {}

    protected onDestroy(): void {
        cc.systemEvent.off(EventType.ORB_EXCHANGE, this.onOrbExchange, this);
        cc.systemEvent.off(EventType.ORB_MATCH, this.onOrbMatch, this);
        cc.systemEvent.off(EventType.ORB_DROP, this.onOrbDrop, this);

    }

    /** 初始化網格 */
    public initGrid() {
        let gridSize = cc.v2(this.gridCol, this.gridRow);
        let ordSize = cc.v2(this.orbPrefab.width, this.orbPrefab.height);
        let gap = this.gap;
        this._grid.init(gridSize, ordSize, gap)

        for(let col = 0; col < gridSize.x; col++) {
            for(let row = 0; row < gridSize.y; row++) {
                const orbNode = cc.instantiate(this.orbPrefab);
                const orbItem = orbNode.getComponent(Orb);
                
                orbNode.setParent(this.gridNode);
                orbNode.setPosition(this._grid.getPos(cc.v2(col, row)));

                const type = [OrbType.H1, OrbType.H2, OrbType.N1, OrbType.N2, OrbType.N3, OrbType.N4][Math.floor(Math.random() * 6)];
                orbItem.init(cc.v2(col, row), type);

                this._grid.insertItem(cc.v2(col, row), orbItem);
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

    /** 監聽圖標互換 */
    private onOrbExchange(mainCoord: cc.Vec2, targetCoord: cc.Vec2) {
        cc.warn(`onOrbExchange: [${mainCoord.x}, ${mainCoord.y}] => [${targetCoord.x}, ${targetCoord.y}]`);
        const mainItem = this._grid.getItem(mainCoord);
        const targetItem = this._grid.getItem(targetCoord);

        this._passedOrbs.push(targetItem);
        this._grid.exchangeItem(mainCoord, targetCoord);

        targetItem.transformTo(mainCoord);
        mainItem.setCoord(targetCoord);
    }

    /** 監聽圖標消除 */
    private async onOrbMatch(e: cc.Touch, orb: Orb) {
        cc.warn(`onOrbPut: [${orb.coord.x}, ${orb.coord.y}]`);
        const match3List = [] as Orb[];
        this._passedOrbs.forEach(orb => {
            cc.warn(`passedOrb: [${orb.coord.x}, ${orb.coord.y}]`);
            match3List.push(...this._grid.getMatch3List(orb.coord));
        });
        this._passedOrbs.length = 0;

        // 消除動畫
        match3List.sort((a, b) => a.coord.y - b.coord.y);
        for(let i = 0; i < match3List.length; i++) {
            match3List[i].isMatch = false;
            if (i === match3List.length - 1) {
                await match3List[i].playWinEffect();
            } else {
                match3List[i].playWinEffect();
            }
        };
        // // 掉落動畫
        // for(let i = 0; i < match3List.length; i++) {
        //     const main = match3List[i];

        //     matchCount[main.coord.x] += 1;
        //     let originY = main.coord.y;
        //     this._passedOrbs.push(main);

        //     // 調整座標
        //     for(let curY = originY; curY > 0; curY--) {
        //         const lowerOrb = main;
        //         const upperOrb = this._grid.getItem(cc.v2(main.coord.x, main.coord.y - 1));
    
        //         this._passedOrbs.push(upperOrb);
        //         this._grid.exchangeItem(lowerOrb.coord, upperOrb.coord);
        //         const lowerCoord = lowerOrb.coord;
        //         const upperCoord = upperOrb.coord;
        //         if (curY === 1) {
        //             lowerOrb.transformTo(upperCoord, false);
        //             upperOrb.transformTo(lowerCoord, false);
        //         } else {
        //             upperOrb.transformTo(lowerCoord, false);
        //             lowerOrb.transformTo(upperCoord, false);
        //         }
        //     }
        //     // 移動到最上方
        //     // main.node.y = this.gridRow * (this.gap + this.orbPrefab.height);
        //     // cc.tween(main.node)
        //     //     .to(1, { position: cc.v3(this._grid.getPos(main.coord)) }, {easing: cc.easing.quadOut})
        //     //     .call(() => {
        //     //         if (i === match3List.length - 1) {
        //     //             this.onOrbMatch(null, main);
        //     //         }
        //     //     })
        //     //     .start();

        //     // main.setType(null);

        //     cc.error("main", main.coord.x,"-", main.coord.y,"after")
            
        //     // 必須等所有盤面 drop 完畢才能進行 match
        //     this.scheduleOnce(() => {
        //         this.onOrbMatch(null, main);
        //         main.node.active = true;
        //     });
        // };

    }

    /** 監聽圖標掉落 */
    private async onOrbDrop(main: Orb) {
        let originY = main.coord.y;
        this._passedOrbs.push(main);
        main.node.active = false;

        for(let curY = originY; curY > 0; curY--) {
            const lowerOrb = main;
            const upperOrb = this._grid.getItem(cc.v2(main.coord.x, main.coord.y - 1));

            this._passedOrbs.push(upperOrb);
            const lowerCoord = lowerOrb.coord;
            const upperCoord = upperOrb.coord;
            if (curY === 1) {
                lowerOrb.transformTo(upperCoord, false);
                upperOrb.transformTo(lowerCoord, false);
            } else {
                upperOrb.transformTo(lowerCoord, false);
                lowerOrb.transformTo(upperCoord, false);
            }
            this._grid.exchangeItem(lowerOrb.coord, upperOrb.coord);
        }
        main.setType(null);
        main.node.active = true;
        cc.error("main", main.coord.x,"-", main.coord.y,"after")
        
        // 必須等所有盤面 drop 完畢才能進行 match
        this.scheduleOnce(() => {
            this.onOrbMatch(null, main);
            main.node.active = true;
        });
    }
}
