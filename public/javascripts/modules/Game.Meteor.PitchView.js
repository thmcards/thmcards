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


			var answeredCard = _.find(this.cardsQueue, function(card){
				console.info(card.back.text_plain);
				if(card.back.text_plain.toLowerCase() === answer.toLowerCase()) {
					return true;
				}
			});

			console.info("answered", answeredCard);


			$(this).removeAttr("style");
			console.log("answered!", answeredCard.identifier);
		
			answeredCard.div.stop().toggle({
				effect: "explode",
				complete: function(){
					$(answeredCard.div).removeAttr("style");
					answeredCard.onPitch = false;
					answeredCard.div.hide();
				}	
			});
			
			
			console.info("queue", this.cardsQueue);

/*			if(this.cardsOnPitch.length > 0 && this.runGame) {

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
			}*/
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
		addCardToPitch: function(cardId) {

/*
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
			*/
		},
		removeCardFromPitch: function(card) {
			console.log("cop", this.cardsOnPitch);
			this.cardsOnPitch.splice($.inArray(card, this.cardsOnPitch),1);

			this.cardsQueue.splice($.inArray(card, this.cardsOnPitch),1);

			$(card).toggle("explode").remove();
		},
		run: function() {
			/*var that = this;
			this.timer = setInterval(function() { 
				if(!that.runGame) {

					_.each($(that.pitch).children(), function(card) {
						$(card).pause();
					});
				} else  {
					_.each($(that.pitch).children(), function(card) {
						$(card).resume();
					});
					//that.loop();





				};
			}, 200);*/
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
							console.log("onpitch", _.where(that.cardsQueue, {onPitch: true}).length, that.itemcnt);
							if(_.where(that.cardsQueue, {onPitch: true}).length < that.itemcnt) {

								that.cardsQueue = _.shuffle(that.cardsQueue);
								var card = _.findWhere(that.cardsQueue, {onPitch: false})
								card.onPitch = true;


								card.div.appendTo("#meteor-pitch");
								

								card.div.css("left", Math.floor((Math.random()*800)+1));

								card.div.animate({
									top: $(this.pitch).height()-card.div.height()+500
								}, {
									duration: that.itemspeed,
									//queue: "cards",
									easing: "linear",
									complete: function(){
										/*console.log("complete", $(this).attr('data-identifier'));
										var cdiv = this;
										var me = _.findWhere(that.cardsQueue, {identifier: $(cdiv).attr('data-identifier')});
											me.onPitch = false;
										console.log("me", me);
					*/

									 	this.animationStarted = 0;
										$(this).removeAttr("style");
										console.log("complete", card.identifier);
										card.onPitch = false;
										that.runGame = false;
									}
								});
								card.div.show();
								console.log(that.runGame);
							}
							//card.div.dequeue("cards");
						} else {
							that.pauseCards();
						}
					}, 300)
		},
		loop: function() {
			var that = this;


			var playcards = this.$el.find("div.playcardcontainer").find("span");
			console.log(playcards);

			var lastRandom = -1;

			while(_.size(this.cardsQueue) < 10) {
				var random = Math.floor((Math.random()*that.collection.length));
			
				while(random == lastRandom) random = Math.floor((Math.random()*that.collection.length));

				var cardId = that.collection.models[random].get("_id");

				that.fillQueue(cardId);

				lastRandom = random;				
			

			//if(this.cardsQueue.length < this.level*2)
			//	setTimeout(cb, 1000);

			}
		},
		pauseCards: function() {
			var cards = _.where(this.cardsQueue, {onPitch: true});

			_.each(cards, function(card){
				card.div.pause();
			})
		},
		startGame: function(ev) {
			ev.preventDefault();
			this.runGame = true;
			//console.log(this.collection.models[0].get("_id"));

			this.run();

		},
		stopGame: function(ev) {
			ev.preventDefault();

			this.runGame = false;

		},
		resumeGame: function(ev) {
			ev.preventDefault();

			
			var cards = _.where(this.cardsQueue, {onPitch: true});
			console.log("onpitch", cards);
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
		}
	});


});