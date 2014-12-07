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
            for (var i = 0; i < 100; i++) {
                var testSprite = app.currentScene.addEntity({
                    sprite: new PIXI.Sprite(app.assetCollection.getTexture('test')),
                    update: function () {
                        this.sprite.rotation += 0.5 * app.deltaTime;
                    }
                });
                testSprite.sprite.anchor.x = 0.5;
                testSprite.sprite.anchor.y = 0.5;
                testSprite.sprite.position.x = SCREEN_SIZE.clone().randomize().x;
                testSprite.sprite.position.y = SCREEN_SIZE.clone().randomize().y;
                testSprite.sprite.rotation = i;
            }
        }, app);

        app.addScene(loadingScene);
        app.addScene(menuScene);
        app.addScene(gameScene);
        app.transitionScene('loading');

        app.start();
    });
}