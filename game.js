SL = sugarLab;

var SCREEN_SIZE = new SL.Vec2(800, 600);

function logPlay() {
    _gaq.push(['_trackEvent', 'Button', 'Play']);
}

function start() {
    var startLoad = new Date;

    window.app = new SL.Game({canvas: document.getElementById('GameCanvas')});

    app.assetCollection = new SL.AssetCollection('res/assets.json', app, function () {
        _gaq.push(['_trackEvent', 'Game', 'Load', '', (new Date - startLoad) / 1000]);
        $('.canvas-container').append(domjs.build(templates.modal));

        var loadingScene = new SL.Scene('loading', [], function () {
        }, app);

        loadingScene.addEntity(new SL.Loader({
            assetCollection: app.assetCollection,
            screenSize: SCREEN_SIZE,
            loadCallback: function () { app.transitionScene('menu'); },
            barColor: 'blue',
            textColor: 'green'
        }));

        var menuScene = new SL.Scene('menu', [], function () {
            var modal = $('.modal');

            modal.append(domjs.build(templates.menu));

            $('.menu .button').on('click', function () {
                modal.empty();
                modal.off();
                app.transitionScene($(this).attr('id'));
            });
        }, app);

        var gameScene = new SL.Scene('game', [], function () {
            var modal = $('.modal');
            modal.empty();
            modal.off();
            modal.hide();

            app.currentScene.addEntity(new Spawner());
            app.currentScene.addEntity(new Player());
        }, app);

        app.addScene(loadingScene);
        app.addScene(menuScene);
        app.addScene(gameScene);
        app.transitionScene('loading');

        app.start();
    });
}

function Caroler (config) {
    var me = this,
        assetConfig = app.assetCollection.assets.carolers[config.type];

    me.type = config.type || 'caroler';
    me.tag = 'caroler';
    me.sprite = new PIXI.Sprite(app.assetCollection.getTexture(config.type));
    me.path = config.path;
    me.sprite.anchor.x = 0.5;
    me.sprite.anchor.y = 0.5;
    me.sprite.position.x = config.position.x;
    me.sprite.position.y = config.position.y;
    me.sprite.rotation = 0;
    me.collider = new SL.Rect(config.position, new SL.Vec2(50, 100));
    me.apparentSize = SL.Tween.lerp(0.5, 1, me.collider.origin.y / SCREEN_SIZE.y);
    me.pathPoint = 0;
    me.isDead = false;

    me.collider.translate(new SL.Vec2(0, -50));

    for (var key in assetConfig) {
        if (assetConfig.hasOwnProperty(key)) {
            me[key] = assetConfig[key];
        }
    }

    me.update = function () {
        var distanceToPoint = me.path[me.pathPoint].distance(me.collider.origin),
            directionToPoint = me.collider.origin.getDirectionVector(me.path[me.pathPoint]),
            totalMove = (me.speed * app.deltaTime) * me.apparentSize;

        if (!me.isDead) {
            if (totalMove < distanceToPoint) {
                me.collider.translate(directionToPoint.scale(totalMove));
            } else {
                if (me.pathPoint === me.path.length - 1) {
                    me.isDead = true;
                } else {
                    me.collider.setLocation(me.path[me.pathPoint].getTranslated(me.collider.size.getScaled(-0.5)));
                    me.collider.translate(me.collider.origin.getDirectionVector(me.path[++me.pathPoint]).scale(totalMove - distanceToPoint));
                }
            }

            me.sprite.position.x = me.collider.origin.x;
            me.sprite.position.y = me.collider.origin.y;

            me.apparentSize = SL.Tween.lerp(0.5, 1, me.collider.origin.y / SCREEN_SIZE.y);
            me.sprite.scale = new PIXI.Point(me.apparentSize, me.apparentSize);
            me.collider = new SL.Rect(me.collider.location, new SL.Vec2(50, 100).scale(me.apparentSize));
        } else {
            app.currentScene.removeEntity(me);
        }
    };

    me.hit = function () {
        me.health -= 1;

        if (me.health <= 0) {
            me.isDead = true;
        }
    }
}

function Spawner () {
    var me = this;

    me.timeToSpawn = 3;
    me.spawnInterval = 2;
    me.spawnpoints = [
        new SL.Vec2(-50, 200),
        new SL.Vec2(800, 200),
        new SL.Vec2(-50, 400),
        new SL.Vec2(800, 400)
    ];
    me.paths = [
        [
            new SL.Vec2(400, 200),
            new SL.Vec2(400, 600)
        ],
        [
            new SL.Vec2(400, 200),
            new SL.Vec2(400, 600)
        ],
        [
            new SL.Vec2(400, 400),
            new SL.Vec2(400, 600)
        ],
        [
            new SL.Vec2(400, 400),
            new SL.Vec2(400, 600)
        ]
    ];

    me.update = function () {
        var pathNum;

        me.timeToSpawn -= app.deltaTime;

        if (me.timeToSpawn <= 0) {
            pathNum = Math.floor(Math.random() * 4);
            app.currentScene.addEntity(new Caroler({
                type: chooseCaroler(),
                position: me.spawnpoints[pathNum],
                path: me.paths[pathNum]
            }));

            me.timeToSpawn = me.spawnInterval;
        }
    };

    function chooseCaroler () {
        var rand = Math.random(),
            result;

        switch (true) {
            case rand >= 0 && rand <= 0.5:
                result = 'caroler';
                break;
            case rand > 0.5 && rand <= 0.75:
                result = 'snowman';
                break;
            case rand > 0.75 && rand <= 0.9:
                result = 'santa';
                break;
            case rand > 0.9 && rand <= 1:
                result = 'elf';
                break;
            default:
                break;
        }
        return result;
    }
}

function Player (config) {
    var me = this;

    me.health = 10;
    me.clipSize = 7;
    me.clip = me.clipSize;
    me.reloadTime = 1;
    me.timeToReload = 0;
    me.shotCooldown = 0.2;
    me.timeToShotCooldown = 0;
    me.shotJitter = 150;
    me.jitterDecay = 20;
    me.jitter = new SL.Vec2(0, 0);
    me.steadyVelocity = 15;
    me.steady = new SL.Vec2(0, 0);
    me.scopeOffset = new SL.Vec2(0, 0);
    me.sprite = new PIXI.Sprite(app.assetCollection.getTexture('scope'));
    me.sprite.anchor.x = 0.5;
    me.sprite.anchor.y = 0.5;
    me.sprite.position.x = 0;
    me.sprite.position.y = 0;
    me.index = 0;
    me.state = 'rest';

    me.update = function () {
        var offsetScope = app.mouseLocation.getTranslated(me.scopeOffset);

        me.scopeOffset.translate(me.jitter.getScaled(app.deltaTime * 4));

        if (me.state === 'rest') {
            console.log('Jitter: ' + me.jitter.magnitude());

            if (me.jitter.magnitude() > me.jitterDecay * app.deltaTime) {
                me.jitter.translate(me.jitter.getNormal().scale(-1 * (me.jitterDecay * app.deltaTime)));
            } else {
                me.jitter = new SL.Vec2(0, 0);
            }

            if (me.scopeOffset.magnitude() > me.steadyVelocity * app.deltaTime) {
                me.scopeOffset.translate(me.scopeOffset.getNormal().scale(-1 * (me.steadyVelocity * app.deltaTime)));
            } else {
                me.scopeOffset = new SL.Vec2(0, 0);
            }

            if (app.onMouseDown('left')) {
                var hitTestRect = new SL.Rect(offsetScope, new SL.Vec2(1, 1)),
                    carolers = app.currentScene.getEntitiesByTag('caroler'),
                    jitter = new SL.Vec2(me.shotJitter / 2, me.shotJitter / 2).randomize(),
                    jitterDirection = Math.random();

                if (jitterDirection < 0.25) {
                    jitter.x *= -1;
                } else if (jitterDirection < 0.5) {
                    jitter.y *= -1;
                } else if (jitterDirection < 0.75) {
                    jitter.scale(-1);
                }
                me.jitter.translate(jitter);

                for (var i = 0; i < carolers.length; i++) {
                    if (hitTestRect.intersects(carolers[i].collider)) {
                        carolers[i].hit();
                        break;
                    }
                }

                me.clip--;
                if (me.clip === 0) {
                    me.state = 'reloading';
                    me.timeToReload = me.reloadTime;
                } else {
                    me.state = 'cooldown';
                    me.timeToShotCooldown = me.shotCooldown;
                }
            }
        } else {
            if (me.state === 'cooldown') {
                me.timeToShotCooldown -= app.deltaTime;

                console.log('cooldown');
                if (me.timeToShotCooldown <= 0) {
                    me.state = 'rest';
                }
            }
            if (me.state === 'reloading') {
                me.timeToReload -= app.deltaTime;

                console.log('reloading');
                if (me.timeToReload <= 0) {
                    me.state = 'rest';
                    me.clip = me.clipSize;
                    me.timeToReload = me.reloadTime;
                }
            }
        }

        app.currentScene.stage.setChildIndex(me.sprite, app.currentScene.stage.children.length - 1);
        me.sprite.position.x = offsetScope.x;
        me.sprite.position.y = offsetScope.y;
    }
}