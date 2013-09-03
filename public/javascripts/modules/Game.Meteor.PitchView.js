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
			"keyup input.meteor-answer": "onKeypress",
			"blur #itemcnt": "changeItemCnt",
			"blur #itemspeed": "changeItemSpeed"
		},
		points: 0,
		itemcnt: 1,
		itemspeed: 8000,
		level:1,
		lifes:3,
		timer:null,
		gameLoop:null,
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

				if(answer !== '') this.checkResult(answer);
				$(ev.target).val('');
			}
		},
		noCorrectAnswer: function(cardId) {
			var that = this;

			var card = _.findWhere(this.cardsQueue, {_id:cardId});

			$("a.btn-danger").click();

			if(this.lifes > 0) { 
				this.removeLife();
			} else {
				console.log("game over!");
			}

			$('#meteor-answer-modal').on('show.bs.modal', function () {
				$("#meteor-answer-modal-input").val('');
				$("#meteor-answer-modal-front").text(card.front.text_plain);
				$("#meteor-answer-modal-back").text(card.back.text_plain);
			});

			$('#meteor-answer-modal').on('shown.bs.modal', function () {
				$("#meteor-answer-modal-input").focus();
			});

			$("#meteor-answer-modal-input").on('keyup', function(ev){
				var ENTER_KEY = 13;
				if($(this).val() == $("#meteor-answer-modal-back").text()) {
					$("#meteor-answer-modal button.btn-success").removeAttr('disabled');
					if(ev.which === ENTER_KEY) {
						$("#meteor-answer-modal button.btn-success").click();
					}
				} else {
					$("#meteor-answer-modal button.btn-success").attr('disabled', 'disabled');
				}
			});

			$("#meteor-answer-modal button.btn-success").on('click', function(ev) {
				$('#meteor-answer-modal').modal('hide');
			})

			$('#meteor-answer-modal').on('hidden.bs.modal', function () {
				that.runGame = true;
			});

			$('#meteor-answer-modal').on('hide.bs.modal', function () {
				$("input.meteor-answer").val('');
				$("input.meteor-answer").focus();
			});

			$('#meteor-answer-modal').modal('show');
		},
		checkResult: function(answer) {
			var answeredCard = _.find(this.cardsQueue, function(card){
				
				if(( (card.back.text_plain.toLowerCase() === answer.toLowerCase()) || (card.back.text_plain === answer) ) && card.onPitch == true) {
					return true;
				}
			});


			if(!_.isUndefined(answeredCard)) {

				var score = parseInt($("#meteor-points").text()) + 5;
				$("#meteor-points").text(score);
				$("#meteor-points").effect("pulsate", { times:1 }, 1000);

				this.addLife();

				console.info("Correct Answer! "+answeredCard.back.text_plain, "New Score: "+score);

				answeredCard.div.stop().toggle({
					effect: "explode",
					complete: function(){
						$(answeredCard.div).removeAttr("style");
						answeredCard.onPitch = false;
						answeredCard.div.hide();
					}	
				});
			}

		},
		fillQueue: function(cardId){
			var that = this;

			var card = this.collection.get(cardId);
			
			var cardClone = card.pick('_id', 'front', 'back');
			cardClone.identifier = cardClone._id+"_"+new Date().getTime();
			cardClone.onPitch = false;
			
			var c = $("<div>").attr("data-id", cardClone._id).attr("data-identifier", cardClone.identifier).text(cardClone.front.text_plain)
			c.addClass('meteor-playcard');
			c.css("display", "none");

			cardClone.div = c;

			this.cardsQueue.push(cardClone);
		},
		run: function() {
			var playcards = this.$el.find("div.playcardcontainer").find("span");
			
			var lastRandom = -1;
			if(_.size(this.cardsQueue) < 10) {
				var i = 0;
				while(_.size(this.cardsQueue) < playcards.length) {
					var random = Math.floor((Math.random()*this.collection.length));
				
					while(random == lastRandom) random = Math.floor((Math.random()*this.collection.length));

					var cardId = this.collection.models[i].get("_id");

					this.fillQueue(cardId);

					console.log("size", _.size(this.cardsQueue));
					lastRandom = random;	
					i++;			
				}
			}
			console.log(this.cardsQueue.length);

			var that = this;

			this.gameLoop = setInterval(function(){

				if(that.runGame) {
					
					if(_.where(that.cardsQueue, {onPitch: true}).length < that.itemcnt) {

						that.cardsQueue = _.shuffle(that.cardsQueue);
						var card = _.findWhere(that.cardsQueue, {onPitch: false})
						card.onPitch = true;


						card.div.appendTo("#meteor-pitch");
						

						card.div.css("left", Math.floor((Math.random()*800)+20));

						card.div.animate({
							top: $(this.pitch).height()-card.div.height()+500
						}, {
							duration: that.itemspeed,
							easing: "linear",
							complete: function(){
							 	this.animationStarted = 0;
								$(this).removeAttr("style");
								console.log("complete", card.identifier);
								card.onPitch = false;
								that.runGame = false;
								$(this).hide();

								that.noCorrectAnswer($(this).attr("data-id"));
							}
						});
						card.div.show();
						console.log(that.runGame);
					}
				} else {
					that.pauseCards();
				}
			}, 300)
		},
		pauseCards: function() {
			var cards = _.where(this.cardsQueue, {onPitch: true});

			_.each(cards, function(card){
				card.div.pause();
			})
		},
		startGame: function(ev) {
			ev.preventDefault();

			$("#meteor-countdown-welcome").hide();

			var countdown = $("#meteor-countdown-counter");

			var count = 3;
			var timer = setInterval(function() { handleTimer(count); }, 1000);

			var that = this;
			function endCountdown() {
			  $("#meteor-countdown").hide();
			  $("#meteor-statistics").show();
			  $("input.form-control.meteor-answer").prop('disabled', false);
			  $("input.form-control.meteor-answer").focus();
			  that.run();
			}

			function handleTimer() {
			  if(count === 0) {
			    clearInterval(timer);
			    endCountdown();
			  } else {
			  	countdown.text(count);
			    count--;
			  }
			}
		},
		stopGame: function(ev) {
			ev.preventDefault();

			this.runGame = false;
		},
		resumeGame: function(ev) {
			ev.preventDefault();

			var cards = _.where(this.cardsQueue, {onPitch: true});
			
			_.each(cards, function(card){
				card.div.css("backgroundColor", "#ff0000");
				card.div.resume();
			});
			this.runGame = true;
		},
		onClose: function(){
			clearInterval(this.gameLoop);
		},
		changeItemCnt: function(){
			this.itemcnt = $("#itemcnt").val();
			console.log(itemcnt);
		},
		changeItemSpeed: function(){
			this.itemspeed = $("#itemspeed").val();
			console.log("speed", itemspeed);
		},
		addLife: function(){
			var lifes = $("#meteor-lifes").children().length;
			var life = $("<span>").addClass('glyphicon glyphicon-heart').css("display", "none");

			if(lifes < 5) {
				$("#meteor-lifes").append(life);
				life.slideToggle(400);
			}
		},
		removeLife: function(){
			var lifes = $("#meteor-lifes").children().length;
			
			if(lifes > 0)
				$("#meteor-lifes").children().last().remove();
		}
	});


});