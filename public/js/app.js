'use strict';

const app = angular.module('web-collab-board', []);
let scope;

app.controller('controller', function($scope) {
    $scope.user = null;
    $scope.users = null;
    $scope.session = null;
    $scope.sessions = null;
    $scope.version = null;
    $scope.versions = null;
    $scope.cursors = {};
    $scope.views = {};
    $scope.inCanvas = false;
    $scope.isDrawing = false;
    $scope.chalkLine = null;
    scope = $scope;

    initApi("board");

    $scope.initApp = function () {
        $scope.board = document.getElementById("board-canvas");
        $scope.context = $scope.board.getContext("2d");

        $scope._listenChalk();
    };

    listUsers().then(
        users => {
            $scope.users = users;
            $scope.$apply();
        }
    );

    $scope.userCreate = function () {
        const userInput = $("#user-input");
        const colourInput = $("#colour-input");

        createUser({
            name: userInput.val(),
            colour: colourInput.val()
        }).then(
            user => $scope.applyUser(user)
        );
    };

    $scope.userLogin = function (user) {
        setUser(user.id).then(
            user => $scope.applyUser(user)
        );
    };

    $scope.applyUser = function (user) {
        $scope.user = user;
        $scope.$apply();
        listSessions().then(
            sessions => {
                $scope.sessions = sessions;
                $scope.$apply();
            }
        );
    };

    $scope.sessionCreate = function () {
        const sessionInput = $("#session-input");

        createSession({name: sessionInput.val()}).then(
            session => {
                $scope.applySession(session);
            }
        );
    };

    $scope.sessionJoin = function (session) {
        joinSession(session.id).then(
            () => {
                $scope.applySession(session);
            }
        );
    };

    $scope.applySession = function (session) {
        $scope.session = session;
        $scope.$apply();

        $scope.initApp();
        $scope.versionsList();
    };

    $scope.sessionLeave = function () {
        const cursors = document.getElementsByClassName("cursor");
        for (let cursor of cursors) {
            document.body.removeChild(cursor);
        }
        $scope._transmitLeave($scope.user);

        leaveSession().then(
            () => {
                $scope.session = null;
                $scope.$apply();
            }
        );
    };

    $scope.versionCreate = function () {
        const nameInput = $("#version-input");
        const name = nameInput.val();

        createVersion({name: name}).then(
            () => $scope.versionsList()
        );
    };

    $scope.versionRestore = function (version) {
        restoreVersion(version.id);
    };

    $scope.versionsList = function () {
        listVersions().then(
            versions => {
                $scope.versions = versions;
                $scope.$apply();
            }
        );
    };

    $scope.enterCanvas = function () {
        $scope.inCanvas = true;
    };

    $scope.leaveCanvas = function () {
        $scope.inCanvas = false;
    };

    $scope.mouseDown = function () {
        $scope.isDrawing = true;

        const user = $scope.user;
        $scope.chalkLine = {
            colour: user.data.colour,
            key: createKey("/chalkboard"),
            points: []
        };
    };

    $scope.mouseUp = function () {
        $scope.isDrawing = false;

        $scope.chalkLine = null;
    };

    $scope.mouseDrag = function (event) {
        if (!$scope.inCanvas || !$scope.isDrawing) {
            return;
        }

        const client =  $scope.board.getBoundingClientRect();
        const points = $scope.chalkLine.points;
        points.push({
            x: event.clientX - client.left,
            y: event.clientY - client.top
        });

        $scope._uploadChalk($scope.chalkLine);
    };

    $scope.drawChalk = function (chalkLine) {
        const context = $scope.context;
        const points = chalkLine.points;
        const colour = chalkLine.colour;
        context.strokeStyle = colour;

        if (points.length < 2) {
            context.beginPath();
            context.moveTo(points[0].x, points[0].y);
            context.stroke();
            context.closePath();
            return;
        }

        context.beginPath();
        context.moveTo(points[0].x, points[0].y);
        context.lineTo(points[1].x, points[1].y);
        context.stroke();
        for (let n = 2; n < points.length; n += 1) {
            context.moveTo(points[n-1].x, points[n-1].y);
            context.lineTo(points[n].x, points[n].y);
            context.stroke();
        }
        context.closePath();
    };

    $scope.clearChalk = function () {
        deleteModel("/chalkboard");
    };

    $scope._uploadChalk = function (chalkLine) {
        const ref = `/chalkboard/${chalkLine.key}`;
        const data = {
            colour: chalkLine.colour,
            points: chalkLine.points
        };
        updateModel(ref, data);
    };

    $scope._listenChalk = function () {
        const ref = "/chalkboard";
        listenModel(ref, function (data) {
            $scope._clearBoard();

            for (let ckey in data) {
                let chalkLine = data[ckey];
                $scope.drawChalk(chalkLine);
            }
        });
    };

    $scope._clearBoard = function () {
        const board = $scope.board;
        const context = $scope.context;

        context.clearRect(0, 0, board.width, board.height);
    };


    $scope.$on("destroy", $scope.sessionLeave);
});

function enterCanvas() {
    scope.enterCanvas();
}

function leaveCanvas() {
    scope.leaveCanvas();
}

function mouseDown() {
    scope.mouseDown();
}

function mouseUp() {
    scope.mouseUp();
}

function mouseDrag(event) {
    scope.mouseDrag(event);
}
