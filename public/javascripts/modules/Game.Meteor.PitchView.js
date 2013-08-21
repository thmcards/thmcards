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
				$(ev.target).val('');
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
				5000, 
				function() {
					console.log("complete");
				}
			);
		},
		startGame: function(ev) {
			ev.preventDefault();

			var playcards = this.$el.find("div.playcardcontainer").children();


			var card = $(playcards[1]);


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