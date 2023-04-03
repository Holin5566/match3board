import Orb from "./Orb";

class GridSystem {
    private static _instance: GridSystem = null;
    public static get instance(): GridSystem {
        if (!GridSystem._instance) {
            GridSystem._instance = new GridSystem();
        }
        return GridSystem._instance;
    }
    private _orbMatrix: Orb[][];
    private _gridSize: cc.Vec2;
    private _cellSize: cc.Vec2;
    private _gap: number;

    /** 初始化 */
    public init(gridSize: cc.Vec2, cellSize: cc.Vec2, gap: number) {
        this._gridSize = gridSize;
        this._cellSize = cellSize;
        this._gap = gap;
        this._orbMatrix = [];
    }

    /** 置入物件 */
    public insertItem(coord: cc.Vec2, item: Orb) {
        if (!this._orbMatrix[coord.x]) {
            this._orbMatrix[coord.x] = [];
        }
        this._orbMatrix[coord.x][coord.y] = item;
    }

    /** 互換物件座標 */
    public exchangeItem(mainCoord: cc.Vec2, targetCoord: cc.Vec2) {
        const mainItem = this._orbMatrix[mainCoord.x][mainCoord.y];
        const targetItem = this._orbMatrix[targetCoord.x][targetCoord.y];

        this._orbMatrix[mainCoord.x][mainCoord.y] = targetItem;
        this._orbMatrix[targetCoord.x][targetCoord.y] = mainItem;
    }

    /** 取得物件 by 網格座標 */
    public getItem(coord: cc.Vec2): Orb {
        return this._orbMatrix[coord.x][coord.y];
    }

    /** 取得位置 by 網格座標 */
    public getPos(coord: cc.Vec2): cc.Vec2 {
        return cc.v2(
            coord.x * (this._cellSize.x + this._gap),
            -coord.y * (this._cellSize.y + this._gap)
        );
    }

    /** 取得網格座標 by 位置 */
    public getCoord(pos: cc.Vec2): cc.Vec2 {
        const wid = this._cellSize.x + this._gap;
        const hei = this._cellSize.y + this._gap;

        const x = Math.round(pos.x / wid);
        const y = -Math.round(pos.y / hei);
        return cc.v2(x, y);
    }

    /** 是否超出網格 */
    public isOverSize(coord: cc.Vec2): boolean {
        return coord.x < 0 || coord.x >= this._gridSize.x || coord.y < 0 || coord.y >= this._gridSize.y;
    }

    /** 單向三消檢查 */
    public matchCheck(coord: cc.Vec2, path: cc.Vec2): Orb[] {
        if (this.isOverSize(coord) || this.isOverSize(coord.add(path))) {
            return [];
        }

        const origin = this.getItem(coord);
        const target = this.getItem(coord.add(path));
        if (target.isMatch) {
            return [];
        }

        if (origin.type === target.type) {
            return [target, ...this.matchCheck(coord.add(path), path)];
        }
        return [];
    }

    /** 取得三消清單 */
    public getMatch3List(coord: cc.Vec2) {
        const list: Orb[] = [];
        const paths = [
            cc.v2(1, 0),
            cc.v2(0, 1),
        ]

        // 檢查四向的三消
        paths.forEach((path) => {
            // [...正向清單, ...反向清單]
            const matchOrb = [...this.matchCheck(coord, path), ...this.matchCheck(coord, cc.Vec2.ZERO.sub(path))];
            if (matchOrb.length >= 2) {
                matchOrb.forEach(orb => {
                    orb.isMatch = true;
                    list.push(orb);
                })
            }
        })

        // 檢查延伸分支的三消
        list.forEach(orb => {
            const otherMatchs = this.getMatch3List(orb.coord);
            if (otherMatchs.length > 0) {
                list.push(...otherMatchs);
            }
        })

        if (list.length > 0) {
            list.push(this.getItem(coord));
        }
        return list;
    }


}

export default GridSystem;