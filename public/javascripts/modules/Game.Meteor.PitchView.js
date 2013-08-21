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
			"click a": "startGame",
			"keyup input.meteor-answer": "onKeypress"
		},
		initialize: function() {
			this.cardsOnPitch = new Array();
			this.pitch = '#meteor-pitch';
			this.test = "asd123";
		},
		onKeypress: function(ev) {
			var ENTER_KEY = 13;

			if(ev.which === ENTER_KEY) {
				var answer = $(ev.target).val();
				console.log(answer);

				this.checkResult(answer);
				$(ev.target).val('');
			}
		},
		checkResult: function(answer) {
			if(this.cardsOnPitch.length > 0) {
				var filtered = _.chain(this.cardsOnPitch)
					.filter(function(card) {
						return $(card).find(':first-child').attr('data-answer') == answer;
				}).first().value();

				filtered.stop();

				var top = filtered.css('top');

				var position = $(this.pitch).height()-(top.substring(0, top.length-2)-filtered.height());


				var perc = Math.floor((position / Math.floor($(this.pitch).height()))*100);

				var points = Math.floor(perc / 10);

				var pointVal = $("#meteor-points").text();
				pointVal = parseInt(pointVal)+points;
				$("#meteor-points").text(pointVal);


				console.log("points", points);


				filtered.toggle("explode").remove();

				this.cardsOnPitch = _.without(this.cardsOnPitch, filtered);

			}
		},
		addCardToPitch: function(card) {
			var c = card.clone();
			this.cardsOnPitch.push(c);

			$(this.pitch).append(c);

			var random = Math.floor((Math.random()*($(this.pitch).width()-$(c).width()))); 
			c.css({
				left: random,
				position: 'absolute'
			});

			var x = $(this.pitch).height()-c.height()-15;

			c.animate({ 
					top: "+="+x
				}, 
				15000, 
				function() {
					alert("das war nix!");
				}
			);

			console.log("onPitch:" , this.cardsOnPitch);
		},
		startGame: function(ev) {
			ev.preventDefault();

			var playcards = this.$el.find("div.playcardcontainer").children();


			var card = $(playcards[2]);


			var pitchWidth = $(this.pitch).width();
			var pitchHeight = $(this.pitch).height();

			console.log("pitchWidth", pitchWidth, "pitchHeight", pitchHeight);

			var cardWidth = card.width();
			var cardHeight = card.height();

			console.log("cardWidth", cardWidth, "cardHeight", cardHeight);

			
			

			this.addCardToPitch(card);
/*
			*/

			console.log(playcards);



		}
	});


});