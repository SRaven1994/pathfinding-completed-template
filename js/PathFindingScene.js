class PathFindingScene extends Phaser.Scene {
    /** @type {Phaser.Tilemaps.Tilemap} */
    map
    /** @type {Player} */
    player
    /** @type  {Phaser.Physics.Arcade.Sprite} */
    gun
    /** @type {Array.<Enemy>} */
    enemies = []
    /** @type {Array.<object>} */
    enemySpawnPoints = []
    /** @type {Enemy} */
    activeEnemy
    /** @type {number} */
    minEnemies = 2   
    /** @type  {Phaser.Physics.Arcade.Group} */
    bullets
    constructor() {
        super({ key: 'pathFindingScene' })
    }
    preload() {
        // Player Assets
        this.load.image("player", "assets/man.png")
        this.load.image("playerGun", "assets/man-with-gun.png")
        // Tile Assets
        this.load.image("tileset", "assets/tiles100-spacing2.png")
        this.load.tilemapTiledJSON("tilemap", "assets/tilemap.json")
        // Weapon Assets
        this.load.image("gun", "assets/gun.png")
        this.load.image("bullet", "assets/bullet.png")
        // Enemy Assets
        this.load.image("enemy", "assets/enemy.png")
        this.load.image("enemydead", "assets/dead-enemy.png")
    }
    create() {
        this.map = this.make.tilemap({key: "tilemap"})
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels)
        this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels)
        const tileset = this.map.addTilesetImage("tileset", "tileset")
        const groundAndWallsLayer = this.map.createLayer("groundAndWallsLayer", tileset, 0, 0)
        groundAndWallsLayer.setCollisionByProperty({valid: false})
        const objectLayer = this.map.getObjectLayer("objectLayer")
        objectLayer.objects.forEach(function(object){
            let dataObject = Utils.RetrieveCustomProperties(object)
            if(dataObject.type === "playerSpawn"){
                this.player = new Player(this, dataObject.x, dataObject.y, "player")
            }else if(dataObject.type === "gunSpawn"){
                // @ts-ignore
                this.gun = this.physics.add.sprite(dataObject.x, dataObject.y, "gun")
            }else if(dataObject.type === "enemySpawn"){
                // @ts-ignore
                this.enemySpawnPoints.push(dataObject)
            }
        }, this)
        this.physics.add.collider(this.player.sprite, groundAndWallsLayer)
        this.physics.add.overlap(this.player.sprite, this.gun, this.collectGun, null, this)    
        // Bullet Group
        this.bullets = this.physics.add.group({
            defaultKey: "bullet",
            maxSize: 50,
            collideWorldBounds: true
        })
        this.physics.world.on("worldbounds", this.worldBoundsBullet, this)
        this.physics.add.collider(this.bullets,groundAndWallsLayer, this.bulletHitWall, null, this)
        this.events.on("firebullet", this.fireBullet, this)
        // Enemy Mechanics
        this.events.on("enemyready", this.handleEnemyMove, this)
        this.time.delayedCall(1000, this.onEnemySpawn, [], this)
        // @ts-ignore
        this.finder = new EasyStar.js()
        // 2D map tiles
        let grid = []
        for (let y = 0; y < this.map.height; y++){
            let col = []
            for(let x = 0; x < this.map.width; x++){
                let tile = this.map.getTileAt(x, y)
                if(tile){
                    col.push(tile.index)
                }else{
                    // If no tiles exist
                    col.push(0)
                }
            }
            grid.push(col)
        }
        // Get map info to EasyStar
        this.finder.setGrid(grid)
        // tileset Props
        let properties = tileset.tileProperties
        // Hold valid Tiles 
        let acceptableTiles = []
        for(let i = tileset.firstgid -1; i < tileset.total; i++){
            // Look for tiles
            if(properties[i] && properties[i].valid){
                // Add Valid tile to list
                acceptableTiles.push(i + 1)
            }
        }
        // Which tiles can be used
        this.finder.setAcceptableTiles(acceptableTiles)
    }
    findPath(point) {
        //  Point object of x and y to pixels
        let toX = Math.floor(point.x/this.map.tileWidth)
        let toY = Math.floor(point.y/this.map.tileHeight)
        let fromX = Math.floor(this.activeEnemy.sprite.x/this.map.tileWidth)
        let fromY = Math.floor(this.activeEnemy.sprite.y/this.map.tileHeight)
        let callback = this.moveEnemy.bind(this)
        this.finder.findPath(fromX, fromY, toX, toY, function(path){
            if(path === null){
                console.warn("No path found")
            }else{
                callback(path)
            }
        })
        // Execute Path Query
        this.finder.calculate()
    }
    moveEnemy(path) {
        if(this.player.isDead){
            return
        }
        let tweenList = []
        for(let i = 0; i < path.length -1; i++){
            let cx = path[i].x
            let cy = path[i].y
            let dx = path[i + 1].x
            let dy = path[i + 1].y
            let a
            if(dx > cx){
                a = 0
            }else if(dx < cx){
                a = 180
            }else if(dy > cy){
                a = 90
            }else if(dy < cy){
                a = 270
            }
            tweenList.push({
                targets: this.activeEnemy.sprite,
                x: {value: (dx * this.map.tileWidth) + (0.5 * this.map.tileWidth), duration: this.activeEnemy.speed},
                y: {value: (dy * this.map.tileHeight) + (0.5 * this.map.tileHeight), duration: this.activeEnemy.speed},
                angle: {value: a, duration: 0}
            })
        }
        this.tweens.timeline({
            tweens: tweenList,
        })
    }
    onEnemySpawn() {
        let index = Phaser.Math.Between(0, this.enemySpawnPoints.length - 1)
        let spawnPoint = this.enemySpawnPoints[index]
        let enemy = new Enemy(this, spawnPoint.x, spawnPoint.y, "enemy")
        enemy.targetX = spawnPoint.x
        enemy.targetY = spawnPoint.y
        this.enemies.push(enemy)
        this.physics.add.overlap(this.player.sprite, enemy.sprite, this.collideEnemy, null, this)
    }
    handleEnemyMove(enemy) {
        this.activeEnemy = enemy
        let toX = Math.floor(this.player.sprite.x / this.map.tileWidth) * this.map.tileWidth + (this.map.tileWidth/2)
        let toY = Math.floor(this.player.sprite.y / this.map.tileHeight) * this.map.tileHeight + (this.map.tileHeight/2)
        this.findPath({x:this.player.sprite.x, y:this.player.sprite.y})
        enemy.targetX = toX
        enemy.targetY = toY
        this.findPath({x:toX,y:toY})
    }
    collectGun(player, gun) {
        this.gun.destroy()
        this.player.hasGun = true
        this.player.sprite.setTexture("playerGun")
    }
    fireBullet() {
        let vector = new Phaser.Math.Vector2(48, 19)
        vector.rotate(this.player.sprite.rotation)
        let bullet = this.bullets.get(this.player.sprite.x+vector.x, this.player.sprite.y+vector.y)
        if(bullet){
            bullet.setDepth(3)
            bullet.body.collideWorldBounds = true
            bullet.body.onWorldBounds = true
            bullet.enableBody(false, bullet.x, bullet.y, true, true)
            bullet.rotation = this.player.sprite.rotation
            this.physics.velocityFromRotation(bullet.rotation, 500, bullet.body.velocity)
            for(let i = 0; i < this.enemies.length; i++){
                this.physics.add.collider(this.enemies[i].sprite, bullet, this.bulletHitEnemy, null, this)
            }
        }
    }
    worldBoundsBullet(body) {
        // Return bullet to Pool
        body.gameObject.disableBody(true, true)
    }
    bulletHitWall(bullet, layer) {
        bullet.disableBody(true, true)
    }
    bulletHitEnemy(enemySprite, bullet) {
        bullet.disableBody(true, true)
        let index
        for (let i = 0; i < this.enemies.length; i++) {
            if (this.enemies[i].sprite === enemySprite) {
                index = i
                break
            }
        }
        this.enemies.splice(index, 1)
        this.add.image(enemySprite.x, enemySprite.y, 'enemydead').setRotation(enemySprite.rotation).setDepth(0)
        enemySprite.destroy()
        if (!this.player.isDead && this.enemies.length < this.minEnemies) {
            this.onEnemySpawn()
        }
    }
    collideEnemy(player, enemySprite) {
        this.tweens.killAll()
        this.physics.pause()
        this.player.isDead = true
        this.player.sprite.setTint(0xff0000)
    }
    update(time, delta) {
        this.player.update(time, delta)
        for (let i = 0; i < this.enemies.length; i++){
            this.enemies[i].update(time, delta)
        }   
    }
}
