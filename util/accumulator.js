const log = require("./common.js").log;

module.exports = {
    AccumulatorManager: class AccumulatorManager {
        constructor(db, interval) {
            Object.assign(this, {db, interval});
            this.lastWrite = 0;
            this.controls = new Map();
            this.processing = false;
        }
        _registerControl(name, control) {
            this.controls.set(name, control);
        }
        add(name, key) {
            this.controls.get(name).add(key);
            if (Date.now() > this.lastWrite+this.interval && !this.processing && this.db.driver.open) {
                this.processing = true;
                (async () => {
                    this.processingCount = this.controls.length;
                    await this.db.run("BEGIN TRANSACTION");
                    await Promise.all([].concat([...this.controls.values()].map(control => control.execute())));
                    await this.db.run("END TRANSACTION");
                    this.processing = false;
                    this.lastWrite = Date.now();
                })().catch(err => {
                    console.error("Error while updating hit counts");
                    console.error(err);
                    this.db.run("ROLLBACK");
                });
            }
        }
    },
    AccumulatorControl: class AccumulatorControl {
        constructor(name, manager, table, filterColumn, countColumn) {
            Object.assign(this, {name, manager, table, filterColumn, countColumn});
            this.map = new Map();
            this.manager._registerControl(this.name, this);
        }
        add(key) {
            if (this.map.has(key)) {
                this.map.set(key, this.map.get(key)+1);
            } else {
                this.map.set(key, 1);
            }
        }
        execute() {
            log("HitAcc: "+this.map.size+" items updated in "+this.table, "spam");
            if (this.map.size == 0) return Promise.resolve();
            let map = this.map;
            this.map = new Map();
            let keys = [...map.keys()];
            return this.manager.db.run(
                `INSERT OR IGNORE INTO ${this.table} (${this.filterColumn}, ${this.countColumn}) VALUES `+
                `(?, 0), `.repeat(map.size-1)+`(?, 0)`,
                keys
            ).then(() => {
                let promises = [];
                for (let key of keys) {
                    promises.push(this.manager.db.run(
                        `UPDATE ${this.table} SET ${this.countColumn} = ${this.countColumn} + ? WHERE ${this.filterColumn} = ?`,
                        [map.get(key), key]
                    ));
                }
                return promises;
            });
        }
    }
}