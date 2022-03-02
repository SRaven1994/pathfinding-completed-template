class Player {
    /** @type {Phaser.Scene} */
    scene
    /** @type {Phaser.Physics.Arcade.Sprite} */
    sprite
    /** @type {number} */
    standardSpeed = 300
    /** @type {number} */
    powerUpSpeed = 500
    /** @type {number} */
    currentSpeed
    /** @type {object} */
    keys
    /** @type {Phaser.Input.Keyboard.Key} */
    spaceBar
    /** @type {boolean} */
    isDead = false
    /** @type {boolean} */
    hasGun = false

    constructor(scene, x, y, texture) {
        this.scene = scene
        this.sprite = this.scene.physics.add.sprite(x, y, texture)
        this.sprite.setDepth(2)
        this.sprite.setCollideWorldBounds(true)
        this.spaceBar =  scene.input.keyboard.createCursorKeys().space
        this.keys = scene.input.keyboard.addKeys({
            w: Phaser.Input.Keyboard.KeyCodes.W,
            a: Phaser.Input.Keyboard.KeyCodes.A,
            s: Phaser.Input.Keyboard.KeyCodes.S,
            d: Phaser.Input.Keyboard.KeyCodes.D
        })
        this.currentSpeed = this.standardSpeed
    }
    update(time, delta) {
        if (!this.isDead) {
            if (this.keys.a.isDown) {
                this.sprite.setVelocity(-this.currentSpeed, 0)
                this.sprite.angle = 180
            }
            else if (this.keys.d.isDown) {
                this.sprite.setVelocity(this.currentSpeed, 0)
                this.sprite.angle = 0
            }
            else if (this.keys.w.isDown) {
                this.sprite.setVelocity(0, -this.currentSpeed)
                this.sprite.angle = 270
            }
            else if (this.keys.s.isDown) {
                this.sprite.setVelocity(0, this.currentSpeed)
                this.sprite.angle = 90
            }
            else {
                this.sprite.setVelocity(0, 0)
            }
            if (this.sprite.body.velocity.x != 0) {
                this.sprite.setSize(this.sprite.width, this.sprite.height)

            } else if (this.sprite.body.velocity.y != 0) {
                this.sprite.setSize(this.sprite.height, this.sprite.width)
            }
            if (this.hasGun && Phaser.Input.Keyboard.JustDown(this.spaceBar)){
                this.scene.events.emit('firebullet')
            }
        }
    }
}