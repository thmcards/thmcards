Cards.module("Game.Meteor.Pitch", function(Pitch, App) {
	Pitch.ItemView = Backbone.Marionette.ItemView.extend({
		template: "#game-meteor-playcard",
		className: "meteor-playcard",
		events: {
		}
	});	

	Pitch.PitchView = Backbone.Marionette.CompositeView.extend({
		itemView: Pitch.ItemView,
		itemViewContainer: "div.playcardcontainer",
		template: "#game-meteor-pitch",
		className: "well well-sm sidebar-nav",
		events: {
			"click a.btn-primary": "startGame",
			"click a.btn-danger": "stopGame",
			"click a.btn-info": "resumeGame",
			"keyup input.meteor-answer": "onKeypress"
		},
		points: 0,
		level:1,
		lifes:3,
		timer:null,
		cardsOnPitch:null,
		cardsQueue:null,
		initialize: function() {
			this.cardsOnPitch = new Array();
			this.cardsQueue = new Array();
			this.pitch = '#meteor-pitch';
			this.runGame = true;
			
			timer = {
			    timers:{},
			    inc: 0,
			    start:function(cb,gap) {
			        var key = this.inc;
			        this.inc++;
			        timer.timers[key] = [setInterval(cb,gap),cb];
			        return key;
			    },
			    stop:function(id) {
			        if( !timer.timers[id]) return;
			        clearInterval(timer.timers[id][0]);
			        //setInterval(timer.timers[id][1],newgap);
			    },
			    stopAll:function() {
			    	_.each(timer.timers, function(timer){
			    		console.log("timer", timer);
			    		clearInterval(timer[0]);
			    	});
			    	console.log("stop all timer", timer.timers.length);
			    },
			    change:function(id,newgap) {
			        if( !timer.timers[id]) return;
			        clearInterval(timer.timers[id][0]);
			        setInterval(timer.timers[id][1],newgap);
			    }
			};
		},
		onKeypress: function(ev) {
			var ENTER_KEY = 13;

			if(ev.which === ENTER_KEY) {
				var answer = $(ev.target).val();

				this.checkResult(answer);
				$(ev.target).val('');
			}
		},
		noCorrectAnswer: function(card) {
			var that = this;

			//this.stopGame();
			$("a.btn-danger").click();


			if(this.lifes > 0) { 
				this.lifes--;
			} else {
				console.log("game over!");
			}
			$("#meteor-lifes").text(this.lifes);

			$('#meteor-answer-modal').on('show.bs.modal', function () {
				$("#meteor-answer-modal-input").val('');
				$("#meteor-answer-modal-front").text($(card).find(":first-child").text());
				$("#meteor-answer-modal-back").text($(card).find(":first-child").attr("data-answer"));
			});

			$('#meteor-answer-modal').on('shown.bs.modal', function () {
				$("#meteor-answer-modal-input").focus();
			});

			$("#meteor-answer-modal-input").on('keyup', function(ev){
				var ENTER_KEY = 13;
				if($(this).val() == $(card).find(":first-child").attr("data-answer")) {
					$("#meteor-answer-modal button.btn-success").removeAttr('disabled');
					if(ev.which === ENTER_KEY) {
						$("#meteor-answer-modal button.btn-success").click();
					}
				} else {
					$("#meteor-answer-modal button.btn-success").attr('disabled', 'disabled');
				}
			});

			$("#meteor-answer-modal button.btn-success").on('click', function(ev) {
				that.removeCardFromPitch(card);
				$('#meteor-answer-modal').modal('hide');
			})

			$('#meteor-answer-modal').on('hidden.bs.modal', function () {
				//this.resumeGame();
				$("a.btn-info").click();
			});

			$('#meteor-answer-modal').on('hide.bs.modal', function () {
				$("input.meteor-answer").val('');
				$("input.meteor-answer").focus();
			});

			$('#meteor-answer-modal').modal('show');
		},
		checkResult: function(answer) {
			if(this.cardsOnPitch.length > 0 && this.runGame) {

				var filtered = _.find(this.cardsOnPitch, function(card){
					return $(card).find(':first-child').attr('data-answer') == answer;
				});

				if(filtered) {
					filtered.stop();

					var top = filtered.css('top');
					
					// position der unterkante der karte auf spielfeld
					var position = $(this.pitch).height()-(top.substring(0, top.length-2)-filtered.height());

					// prozentuale position auf spielfeld
					var perc = Math.floor((position / Math.floor($(this.pitch).height()))*100);

					var points = Math.floor(perc / 10);

					var pointVal = $("#meteor-points").text();

					pointVal = parseInt(pointVal)+points;
					$("#meteor-points").text(pointVal);
					this.points = pointVal;

					//console.log("points", points);

					if(points >= 50) {
						this.level = 2;
						console.log("level", this.level);
					}

					if(this.lifes < 5) { 
						this.lifes++;
						$("#meteor-lifes").text(this.lifes);
					}
					this.removeCardFromPitch(filtered);
					
				}
			}
		},
		addCardToPitch: function(card) {
			var that = this;

			var c = card.clone();
			this.cardsQueue.push(c);

			var timeout = Math.floor((Math.random()*4000)+500);

			setTimeout(function(){
				that.cardsOnPitch.push(c);

				$(that.pitch).append(c);

				var random = Math.floor((Math.random()*($(that.pitch).width()-$(c).width()))); 
				c.css({
					left: random,
					position: 'absolute'
				});
				//c.hide();

				var x = $(that.pitch).height()-c.height()-15;

				
				
				if(that.points >= 50) {
					that.level = 2;
					$("#meteor-level").text(that.level);
				}

				var speed = (30000+Math.floor((Math.random()*1000)+200)) / that.level;
				console.log(speed);
				

				c.show();
				c.animate({ 
						top: x,
						backgroundColor: "#E0E0E0"
					}, 
					speed, 
					function() {
						that.noCorrectAnswer(this);
					}
				);
			}, timeout);
			console.log("cop", that.cardsOnPitch);
			
		},
		removeCardFromPitch: function(card) {
			console.log("cop", this.cardsOnPitch);
			this.cardsOnPitch.splice($.inArray(card, this.cardsOnPitch),1);

			this.cardsQueue.splice($.inArray(card, this.cardsOnPitch),1);

			$(card).toggle("explode").remove();
			console.log("cop", this.cardsOnPitch);
		},
		run: function() {
			var that = this;
			this.timer = setInterval(function() { 
				if(!that.runGame) {

					_.each($(that.pitch).children(), function(card) {
						$(card).pause();
					});
				} else  {
					_.each($(that.pitch).children(), function(card) {
						$(card).resume();
					});
					that.loop();
				};
			}, 200);
		},
		loop: function() {
			var that = this;

			var playcards = this.$el.find("div.playcardcontainer").children();
			var lastRandom = -1;
			var cb = function(){
				var random = Math.floor((Math.random()*playcards.length));
				
				while(random == lastRandom) random = Math.floor((Math.random()*playcards.length));

				var card = $(playcards[random]);
				that.addCardToPitch(card);

				lastRandom = random;				
			};

			if(this.cardsQueue.length < this.level*2)
				setTimeout(cb, 50);

			
		},
		startGame: function(ev) {
			ev.preventDefault();

			this.run();

		},
		stopGame: function(ev) {
			ev.preventDefault();

			this.runGame = false;

		},
		resumeGame: function(ev) {
			ev.preventDefault();

			this.runGame = true;
			_.each(this.cardsOnPitch, function(card) {
				$(card).resume();
			});
		}
	});


});