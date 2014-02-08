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
			var frontSymbol = $("div.item.active").find("img.cardfront-symbol")
			var backSymbol = $("div.item.active").find("img.cardback-symbol")

			if(ev.target.nodeName == "DIV" || ev.target.nodeName == "SPAN") {
				$("div.learn-cardHelptext").toggle();
				this.$el.find("div.cardContent.back").toggleClass('active');
				this.$el.find("div.cardContent.front").toggleClass('active');		
				front.toggle();
				back.toggle();
				answerButtons.toggle();
				frontSymbol.toggle();
				backSymbol.toggle();	
			}
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
		ui: {
			modalView: "#pictureModalLearn"
		},
		events: {
			"click a.carousel-control": "cycleCarousel",
			"click button.card-success": "answeredCard",
			"click button.card-fail": "answeredCard",
			"click a.btn-showPictureModal": "showModal",
			"click div.box": "checkForPicture"
		},
		cycleCarousel: function(ev) {
			ev.preventDefault();

			if($(ev.currentTarget).hasClass("left")) {
				this.$el.find(":first-child").carousel("prev");
			} else if($(ev.currentTarget).hasClass("right")) {
				this.$el.find(":first-child").carousel("next");
			}
		},
		showModal: function(ev) {
			ev.preventDefault();

			this.showPictureModal();
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
				type = 'put';
				console.log("vorhandene perscard");
			} else {
					persCard = {};
					persCard.value = {
					   "cardId": cardId,
					   "box": boxId
					}
					model['persCard'] = persCard;
					model.set({persCard: persCard});
					type = 'post';
					console.log("neue perscard");
			}
			//speichern und in aktueller box bleiben
			console.log("save");
			model.save({}, {
				type: type,
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
		showPictureModal: function() {
			var cardId = $("div.item.active").children(".box").attr("data-id");
			var actualCard = this.collection.get(cardId);
			var cardContent = null;

			if($("div.item.active").find("div.centered.front").hasClass('active')){
				cardContent = actualCard.get("front");
			} else if($("div.item.active").find("div.centered.back").hasClass('active')) {
				cardContent = actualCard.get("back");
			}

			var imgElem = $(document.createElement('img'));
			imgElem.attr('src', cardContent.picture);
			imgElem.attr('alt', cardContent.text_plain);
			imgElem.attr('width', "538px");

			$("#setdetails-pictureModal-body").empty();
			$("#setdetails-pictureModal-body").append(imgElem);

			this.ui.modalView.modal('show');
		},
		checkForPicture: function(ev) {
			console.log("check picture");
			if(this.collection.length !== 0) {
				var cardId = $("div.item.active").children(".box").attr("data-id");
				var actualCard = this.collection.get(cardId);

				if($("div.item.active").find("div.centered.front").hasClass('active')){
					if(actualCard.get('front').picture !== null){
						this.$el.find("a.btn-showPictureModal").show();
					} else if(actualCard.get('front').picture == null){
						this.$el.find("a.btn-showPictureModal").hide();
					}
				} else if($("div.item.active").find("div.centered.back").hasClass('active')) {
					if(actualCard.get('back').picture !== null){
						this.$el.find("a.btn-showPictureModal").show();
					} else if(actualCard.get('back').picture == null){
						this.$el.find("a.btn-showPictureModal").hide();
					}
				}		
			}
		},
		onRender: function() {	
			var that = this;
			$("div.learn-startscreen").hide();
			$("div.learn-endscreen").hide();
			$("div.carousel").show();

			if (this.collection.length == 0) {
				$("div.learn-cardHelptext").hide();
			} else {
				$("div.learn-cardHelptext").show();				
			}

			this.$el.find("div.item").first().addClass("active");

			this.$el.find("div.cardContent.back").removeClass('active');
			this.$el.find("div.cardContent.front").addClass('active');

			var pickerContainer = this.$el.find("ol.carousel-indicators").first();
			for(var i = 0; i < this.collection.length; i++) {
				var indicatorElem = $("<li></li>").attr("data-slide-to", i);
				if(i === 0) indicatorElem.addClass("active");	
				pickerContainer.append(indicatorElem);
			}

			var cardCount = this.$('.item').length;

			if(cardCount==1){
				this.$el.find("small.card-indicator").html('Noch '+cardCount+' Karte im aktuellen Fach');
			} else if(cardCount>1){
				this.$el.find("small.card-indicator").html('Noch '+cardCount+' Karten im aktuellen Fach');
			}
			

			this.$el.find(':first-child').carousel({ interval: false });

			this.$el.find(':first-child').on('slid.bs.carousel', function () {
				that.checkForPicture() 
				console.log("sliiiiide");
				if(cardCount==1){
					that.$el.find("small.card-indicator").html('Noch '+cardCount+' Karte im aktuellen Fach');
				} else if(cardCount>1){
					that.$el.find("small.card-indicator").html('Noch '+cardCount+' Karten im aktuellen Fach');
				}
			});

			if(this.collection.length !== 0) {
				var cardId = this.$el.find("div.item").children(".box").attr("data-id");
				console.log(cardId);
				var actualCard = this.collection.get(cardId);
				if(actualCard.get('front').picture !== null){
					this.$el.find("a.btn-showPictureModal").show();
				}
				console.log(actualCard);			
			}
		}
	});
});