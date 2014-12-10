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

        var scoreScene = new SL.Scene('score', [], function (entities) {
            var modal = $('.modal'),
                scoreText = new PIXI.Text('Score: ' + entities[0].score, {font: '18px Arial', fill: 'red'});

            modal.append(domjs.build(templates.score));
            modal.show();

            $('.menu .button').on('click', function () {
                modal.empty();
                modal.off();
                app.transitionScene($(this).attr('id'));
            });

            scoreText.position.x = 350;
            scoreText.position.y = 400;

            this.stage.addChild(scoreText);

            $('.twitter-share-button').attr('href', 'https://twitter.com/share?url=http://synsugarstudio.com/ld31&hashtags=ld31,bahhumbug&text=I scored ' + entities[0].score + ' on Bah! Humbug!');
        }, app);

        app.addScene(loadingScene);
        app.addScene(menuScene);
        app.addScene(gameScene);
        app.addScene(scoreScene);
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
    me.timeToStep = 0.1;
    me.stepInterval = 0.1;
    me.stepState = 0;

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
            me.timeToStep -= app.deltaTime;

            if (totalMove < distanceToPoint) {
                me.collider.translate(directionToPoint.scale(totalMove));
            } else {
                if (me.pathPoint === me.path.length - 1) {
                    me.isDead = true;
                    app.currentScene.getEntitiesByTag('player')[0].hit();
                } else {
                    me.collider.setLocation(me.path[me.pathPoint].getTranslated(me.collider.size.getScaled(-0.5)));
                    me.collider.translate(me.collider.origin.getDirectionVector(me.path[++me.pathPoint]).scale(totalMove - distanceToPoint));
                }
            }

            me.sprite.position.x = me.collider.origin.x;
            me.sprite.position.y = me.collider.origin.y;

            if (me.timeToStep <= 0) {
                me.timeToStep = me.stepInterval;
                me.stepState++;

                if (me.stepState > 3) {
                    me.stepState = 0;
                }
            }
            switch (me.stepState) {
                case 0:
                    me.sprite.rotation = -0.02;
                    break;
                case 2:
                    me.sprite.rotation = 0.02;
                    break;
                default:
                    me.sprite.position.y += 5;
            }

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
            return me.pointValue;
        }

        return 0;
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
            case rand >= 0 && rand <= 0.75:
                result = 'caroler';
                break;
            case rand > 0.75 && rand <= 0.90:
                result = 'snowman';
                break;
            case rand > 0.90 && rand <= 0.98:
                result = 'santa';
                break;
            case rand > 0.98 && rand <= 1:
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

    me.tag = 'player';
    me.score = 0;
    me.health = 1;
    me.clipSize = 7;
    me.clip = me.clipSize;
    me.reloadTime = 1;
    me.timeToReload = 0;
    me.shotCooldown = 0.2;
    me.timeToShotCooldown = 0;
    me.jitterBase = 500;
    me.jitterRange = 100;
    me.steady = 150;
    me.scopeVelocity = new SL.Vec2(0, 0);
    me.scopeOffset = new SL.Vec2(0, 0);
    me.scopeRest = 1;
    me.sprite = new PIXI.Sprite(app.assetCollection.getTexture('scope'));
    me.sprite.anchor.x = 0.5;
    me.sprite.anchor.y = 0.5;
    me.sprite.position.x = 0;
    me.sprite.position.y = 0;
    me.index = 0;
    me.state = 'rest';
    me.bulletTexture = app.assetCollection.getTexture('bullet');
    me.heartTexture = app.assetCollection.getTexture('heart');
    me.bullets = [];
    me.hearts = [];
    me.scoreText = new PIXI.Text('Score: 0', {font: '18px Arial', fill: 'red'});

    me.scoreText.position.x = 650;
    me.scoreText.position.y = 20;

    me.update = function () {
        var offsetScope = app.mouseLocation.getTranslated(me.scopeOffset);

        me.scopeOffset.translate(me.scopeVelocity.getScaled(app.deltaTime));
        me.scopeVelocity.scale(0.9);
        if (me.scopeVelocity.magnitude() < me.scopeRest) {
            me.scopeVelocity = new SL.Vec2(0, 0);
        }

        if (me.state === 'rest') {
            if (me.scopeOffset.magnitude() > me.steady * app.deltaTime) {
                me.scopeOffset.translate(me.scopeOffset.getNormal().scale(-1 * (me.steady * app.deltaTime)));
            } else {
                me.scopeOffset = new SL.Vec2(0, 0);
            }

            if (app.onMouseDown('left')) {
                var hitTestRect = new SL.Rect(offsetScope, new SL.Vec2(1, 1)),
                    carolers = app.currentScene.getEntitiesByTag('caroler'),
                    jitter = new SL.Vec2(me.jitterRange / 2, me.jitterRange / 2).randomize(),
                    jitterDirection = Math.random();

                jitter.translate(new SL.Vec2(me.jitterBase, me.jitterBase));
                if (jitterDirection < 0.25) {
                    jitter.x *= -1;
                } else if (jitterDirection < 0.5) {
                    jitter.y *= -1;
                } else if (jitterDirection < 0.75) {
                    jitter.scale(-1);
                }
                me.scopeVelocity.translate(jitter);

                for (var i = 0; i < carolers.length; i++) {
                    if (hitTestRect.intersects(carolers[i].collider)) {
                        me.score += carolers[i].hit();
                        me.scoreText.setText('Score: ' + me.score);
                        if (carolers[i].type === 'elf') {
                            me.health++;
                            addHeart();
                        }
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

                removeBullet();
            }
        } else {
            if (me.state === 'cooldown') {
                me.timeToShotCooldown -= app.deltaTime;

                if (me.timeToShotCooldown <= 0) {
                    me.state = 'rest';
                }
            }
            if (me.state === 'reloading') {
                me.timeToReload -= app.deltaTime;

                if (me.timeToReload <= 0) {
                    me.state = 'rest';
                    me.clip = me.clipSize;
                    me.timeToReload = me.reloadTime;

                    for (var i = 0; i < me.clip; i++) {
                        addBullet();
                    }
                }
            }
        }

        app.currentScene.stage.setChildIndex(me.sprite, app.currentScene.stage.children.length - 1);
        me.sprite.position.x = offsetScope.x;
        me.sprite.position.y = offsetScope.y;
    }

    me.hit = function () {
        me.health -= 1;
        removeHeart();

        if (me.health < 1) {
            app.transitionScene('score', [{score: me.score, type: 'score'}]);
        }
    }

    addBullet = function () {
        var newBullet = new PIXI.Sprite(me.bulletTexture);

        newBullet.anchor.x = 0.5;
        newBullet.anchor.y = 0.5;
        newBullet.position.x = 15 + (15 * me.bullets.length);
        newBullet.position.y = 500;

        me.bullets.push(newBullet);
        app.currentScene.stage.addChild(newBullet);
    };

    addHeart = function () {
        var newHeart = new PIXI.Sprite(me.heartTexture);

        newHeart.anchor.x = 0.5;
        newHeart.anchor.y = 0.5;
        newHeart.position.x = 768 - (35 * (me.hearts.length % 5));
        newHeart.position.y = 500 + (32 * Math.floor(me.hearts.length / 5));

        me.hearts.push(newHeart);
        app.currentScene.stage.addChild(newHeart);
    };

    removeBullet = function () {
        app.currentScene.stage.removeChild(me.bullets[me.bullets.length - 1]);
        me.bullets.pop();
    };

    removeHeart = function () {
        app.currentScene.stage.removeChild(me.hearts[me.hearts.length - 1]);
        me.hearts.pop();
    };

    for (var i = 0; i < me.clip; i++) {
        addBullet();
    }
    for (i = 0; i < me.health; i++) {
        addHeart();
    }

    app.currentScene.stage.addChild(me.scoreText);
}