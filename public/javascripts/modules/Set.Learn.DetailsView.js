Cards.module('Set.Learn', function(Learn, App) {
	Learn.ItemView = Backbone.Marionette.ItemView.extend({
		template: "#set-learn-item",
		className: "item",
		events: {
			"click a": "linkClicked",
			"click div.box": "cardClicked"
		},
		cardClicked: function(ev) {
			ev.preventDefault();
			console.log(ev.currentTarget);

			var front = $(ev.currentTarget).find('div.front');
			var back = $(ev.currentTarget).find('div.back');
			var answerButtons = $("button.answer");


			$("div.learn-cardHelptext").toggle();	

			front.toggle();
			back.toggle();
			answerButtons.toggle();
		},
		linkClicked: function(ev) {
			ev.preventDefault();
			console.log("link");
			
			//App.trigger("set:details", this.model.get("name").replace(/[^a-zA-Z0-9-_]/g, '_'), this.model.get("id"));
		}
	});	
	Learn.EmptyView = Backbone.Marionette.ItemView.extend({
		template: "#set-learn-item-empty",
		className: "empty-item"
	});

	Learn.DetailsView = Backbone.Marionette.CompositeView.extend({
		emptyView: Learn.EmptyView,
		itemView: Learn.ItemView,
		itemViewContainer: "div.carousel-inner",
		template: "#set-learn-collection",
		events: {
			"click a.carousel-control": "cycleCarousel",
			"click button.card-success": "answeredCard",
			"click button.card-fail": "answeredCard"
		},
		cycleCarousel: function(ev) {
		ev.preventDefault();
		console.log($(ev.currentTarget));

			if($(ev.currentTarget).hasClass("left")) {
				this.$el.find(":first-child").carousel("prev");
			} else if($(ev.currentTarget).hasClass("right")) {
				this.$el.find(":first-child").carousel("next");
			}
		},
		giveAnswer: function(ev) {
		ev.preventDefault();


			if($(ev.currentTarget).hasClass("left")) {
				this.$el.find(":first-child").carousel("prev");
			} else if($(ev.currentTarget).hasClass("right")) {
				this.$el.find(":first-child").carousel("next");
			}

		},
		answeredCard: function(ev) {
			if (ev.target.title === "success") {
				var failed = false;
			} else {
				var failed = true;
			}
			//cardid holen
			var cardId = $("div.item.active").children(".box").attr("data-id");

			//anzahl items im aktuellen fach
			var items = this.$el.find("div.item").length;

			//zuletzt aktive lernkarte
			var lastActiveItem = this.$el.find("div.item").index(this.$el.find("div.item.active"));

			console.info("LAI", lastActiveItem);

			var that = this;
	  		App.on("cardModel:saved", function(val){				
				that.$el.find("div.item").removeClass("active");
				var activeCard = that.$el.find("div.item").get(lastActiveItem);
				$(activeCard).addClass("active");
			})


			//boxid aus personalcard holen wenn vorhanden, ansonsten boxid initial auf 1
			var model = this.collection.get(cardId);
			if(!_.isEmpty(model.get("persCard"))) {
				var persCard;
				if(_.isArray(model.get("persCard"))) {
					persCard = _.first(model.get("persCard"));
				} else {
					persCard = model.get("persCard");
				}
				var boxId = persCard.value.box;
			} else {
				var boxId = 1;
			}

			if (failed) {
				if (boxId === 1) {
					if(items > 1) {
						this.$el.find(":first-child").carousel("next");	

						this.$el.find('div.front').show();
						this.$el.find('div.back').hide();
						$("button.answer").hide();
						$("div.learn-cardHelptext").show();
					}
				} else {		
					//aufruf zum speichern der lernkarte, wenn mehr als eine lernkarte vorher zur nächsten lernkarte wechseln
					if(items > 1) {
						this.$el.find(":first-child").carousel("next");				
						var that = this;
						this.$el.find(":first-child").on('slid.bs.carousel', function () {
				  				that.saveCard(cardId, boxId, failed);

							})				
					} else {
						var lastCard = true;
						this.saveCard(cardId, boxId, failed, lastCard);
						console.log("letzte karte weg");
					}

				}
			}

			if (!failed) {
				if (boxId === 5) {
					if(items > 1) {
						this.$el.find(":first-child").carousel("next");

						this.$el.find('div.front').show();
						this.$el.find('div.back').hide();
						$("button.answer").hide();
						$("div.learn-cardHelptext").show();
					}
				} else {		
					//aufruf zum speichern der lernkarte, wenn mehr als eine lernkarte vorher zur nächsten lernkarte wechseln
					if(items > 1) {
						this.$el.find(":first-child").carousel("next");				
						var that = this;
						this.$el.find(":first-child").on('slid.bs.carousel', function () {
				  				that.saveCard(cardId, boxId, failed);

							})				
					} else {
						var lastCard = true;
						this.saveCard(cardId, boxId, failed, lastCard);
						console.log("letzte karte weg");
					}

				}
			}

		},
		saveCard: function(cardId, boxId, failed, lastCard) {
			var that = this;
			//boxid des aktuellen fachs
			var actualBox = boxId;

			//wenn falsch beantwortet
			if (failed) {
				//zurück in box1
				boxId = 1;
			//wenn richtig beantwortet
			} else {
				//boxid erhöhen wenn nicht schon in box5
				if (boxId < 5) {
					boxId++;
				} else {boxId = 5;}
			}

			//perscard holen/anlegen und mit neuer boxid aktualisieren
			var model = this.collection.get(cardId);
			console.log(model);
			var persCard;
			if(!_.isEmpty(model.get("persCard"))) {	
				if(_.isArray(model.get("persCard"))) {
					persCard = _.first(model.get("persCard"));
				} else {
					persCard = model.get("persCard");
				}
				persCard.value.box = boxId;				
				model['persCard'] = persCard;
				model.set({persCard: persCard});
				console.log("vorhandene perscard");
			} else {
					persCard = {};
					persCard.value = {
					   "cardId": cardId,
					   "box": boxId
					}
					model['persCard'] = persCard;
					model.set({persCard: persCard});
					console.log("neue perscard");
			}
			//speichern und in aktueller box bleiben
			console.log("save");
			model.save({}, {
				success: function(){
					console.log("success");
					App.trigger("filter:box", actualBox);
					App.trigger("cardModel:saved");

					if (lastCard) {
						that.$el.find("div.carousel").hide();
						that.$el.find("div.learn-endscreen").show();
						$("div.learn-cardHelptext").hide();
					}
				}
			});
		},
		initialize: function() {
			var that = this;
			App.on('filter:box', function(boxId) {
				that.filterBox(boxId);
			})

		},
		filterBox: function(boxId) {
			if(boxId != null) {
				this.collection.filter(boxId);
			} else {
				this.collection.filter();
			}
			this.render();
		},
		onRender: function() {	
			$("div.learn-startscreen").hide();
			$("div.learn-endscreen").hide();
			$("div.carousel").show();

			if (this.collection.length == 0) {
				$("div.learn-cardHelptext").hide();
			} else {
				$("div.learn-cardHelptext").show();				
			}

			this.$el.find("div.item").first().addClass("active");

			var pickerContainer = this.$el.find("ol.carousel-indicators").first();
			for(var i = 0; i < this.collection.length; i++) {
				var indicatorElem = $("<li></li>").attr("data-slide-to", i);
				if(i === 0) indicatorElem.addClass("active");	
				pickerContainer.append(indicatorElem);
			}
			this.$el.find(':first-child').carousel({ interval: false });
		}
	});
});