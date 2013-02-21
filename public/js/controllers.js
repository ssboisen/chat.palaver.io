function RoomController($scope, $timeout, socket, pubsub){

    $scope.rooms = [];
    $scope.selectedRoom = null;
    $scope.errorMessage = null;

    $scope.setActiveRoom = function(room) {
      $scope.selectedRoom = room;
      pubsub.publish('selectedRoomChanged', $scope.selectedRoom);
    };

    socket.on('left-room', function(message){
        var room = _.find($scope.rooms, function(r){
            return r.name === message.room_name;
        });

        var index = $scope.rooms.indexOf(room);

        var selectedRoom = $scope.selectedRoom;
        $scope.rooms.splice(index, 1);

        if(selectedRoom === room){

            index = index == $scope.rooms.length ? (index - 1) : index;

            var newSelectedRoom = $scope.rooms[index % $scope.rooms.length];

            $scope.setActiveRoom(newSelectedRoom);
        }
        else {
            //Hack to fix problem with ng-repeater not applying ng-class: active
            $scope.setActiveRoom(null);
            $timeout(function() {
                $scope.setActiveRoom(selectedRoom);
            },1);
        }
    });

    $scope.leaveRoom = function(room) {
        socket.emit('message', {content: '/leave ' + room.name });
    }
	socket.on('chat-message', function(message) {
        var room = _.find($scope.rooms, function(r) {
            return r.name === message.room_name;
        });

        if(room){
            if(!room.messages) room.messages = [];

            room.messages.push({
                    user: message.user,
                    content: message.content,
                    date: message.date
                });
        }
        else {
            console.error("Received chat-message for room which I had not joined: " + message.room_name);
        }

	});

    socket.on('joined-room', function(room){
        var existingRoom = _.find($scope.rooms, function(r){
            return r.name === room.name;
        });

        if(existingRoom)
        {
            var index = $scope.indexOf(existingRoom);
            $scope.rooms[index] = room;
        }
        else{
            $scope.rooms.push(room);
        }

        $scope.setActiveRoom(room);
    });

    socket.on('user-joined-room', function(message) {
        var room = _.find($scope.rooms, function(r) {
            return r.name === message.room_name;
        });

        room.users.push(message.user);
    });

    function doForUserInRoom(username, fn) {
      _.each($scope.rooms, function(room) {
        _.each(room.users, function(user) {
          if(user.username === username) {
            fn(user);
          }
        });
      });
    }

    socket.on('user-online', function (username) {
      doForUserInRoom(username, function (user) { user.online = true; });
    });

    socket.on('user-offline', function (username) {
      doForUserInRoom(username, function (user) { user.online = false; });
    });

    socket.on('chat-error', function(error){
        $scope.errorMessage = error.message;
        $timeout(function() {
            $scope.errorMessage = null;
        }, 5000);
    });
}

function MessageController($scope, socket, pubsub) {

	$scope.message = "";
    $scope.selectedRoom = null;
    pubsub.subscribe('selectedRoomChanged', function(room) {
        $scope.selectedRoom = room;
    });

	$scope.sendmsg = function() {
		if($scope.message){
            var message = {
                content: $scope.message
            }
            if($scope.selectedRoom) {
                message.room_name = $scope.selectedRoom.name;
            }
			socket.emit('message', message);

			$scope.message = "";
		}
	};
}
