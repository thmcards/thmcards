Cards.module("Set.Details.SideBar", function(SideBar, App) {
	SideBar.SideBarView = Backbone.Marionette.ItemView.extend({
		template: "#set-details-sideBar",
		className: "well well-sm sidebar-nav",
		events: {
			"click a.btn-cardLayout": "switchToCardLayout",
			"click a.btn-listLayout": "switchToListLayout"
		},
		switchToCardLayout: function(ev) {
			if (!$('#btnToCardLayout').hasClass("active")) {
				App.trigger("set:details", this.model.get("_id"));
			}
		},
		switchToListLayout: function(ev) {
			if (!$('#btnToListLayout').hasClass("active")) {
				App.trigger("set:detailslist", this.model.get("_id"));
			}
		},
		initialize: function () {
    		_.bindAll(this);
    		this.model.on('change', this.render);
		},
		onRender: function(){
			i18ninit();
		}
	}),
	SideBar.RatingsView = Backbone.Marionette.ItemView.extend({
		template: "#set-details-rating",
		className: "well well-sm sidebar-nav",
		onRender: function() {
			i18ninit();
			var that = this;

			$.get('/rating/permission/'+this.model.get('setId'), function(res){
				console.log("perm", res.permission);
				that.$("#raty").raty({
					score: function() {
				      return $(this).attr('data-score');
				    },
				    readonly: false,
					starOff: '/img/star-off.png',
					starOn : '/img/star-on.png',
					starHalf: '/img/star-half.png',
					hints       : ['Schlecht', 'Könnte besser sein', 'Okay', 'Gut', 'Hervorragend'],
					halfShow    : true,
					half        : false,
					click: function(rating) {
						$('#ratingStars').raty({
							readOnly: true,
							score: rating,
							starOff: '/img/star-off.png',
							starOn : '/img/star-on.png'
						});
						$('#ratingModal').find('span.rating123').text(rating);
						$('#ratingModal').find('span.rating-title').text($("#set-details-sideBar-region").find("h4").text());
						$('#ratingModal').find('textarea').on('keyup', function(ev){
							var lgth = $.trim($(ev.currentTarget).val()).length;
							$('#ratingModal').find('small.char-cnt').text(lgth);
							if(lgth >= 60) {
								$('#ratingModal').find('button.btn-primary').prop("disabled", false);
							} else {
								$('#ratingModal').find('button.btn-primary').prop("disabled", true);
							}
						});
						$('#ratingModal').modal('show');

						$('#ratingModal').on('hidden.bs.modal', function(){
							$('#raty').raty('score', 0);
						});

						$('#ratingModal').find('button.btn-primary').off("click");
						$('#ratingModal').find('button.btn-primary').click(function(ev){
							ev.preventDefault();
							var lgth = $.trim($('#ratingModal').find('textarea').val()).length;
							if(lgth >= 60) {
								$('#ratingModal').find('button.btn-primary').button('loading');
								var ratingObj = {
													value: rating,
													comment: $('#ratingModal').find('textarea').val()
											 	};

								$.ajax({
									type: "POST",
									url: '/set/rating/'+that.model.get('setId'),
									data: JSON.stringify(ratingObj),
									contentType: "application/json",
									success: function(res){
										if(_.has(res, 'ok') && res.ok == true) {
											$('#ratingModal').modal('hide');
											$('#ratingModal').find('button.btn-primary').button('reset');
											App.trigger("set:rating", that.model.get('setId'));
										}
									},
									dataType: "json"
								});
							}
						});

						$('#ratingModal').find('button.btn-default').on('click', function(ev){
							$('#raty').raty('score', $('#raty').attr('data-score'));
							$('#ratingModal').modal('hide');
						});
					}

				});
				$('#raty').raty('readOnly', !res.permission);
			});

		}
	}),

	SideBar.ControlsView = Backbone.Marionette.ItemView.extend({
		template: "#set-details-controls",
		className: "well well-sm sidebar-nav",
		ui: {
			btnAdd: "a.saveSet",
            btnExport: "a.exportSet",
			inputSetName: "input[type=text]",
			modalView: "#editSetModal",
			modalBtnSave: "#editSetModal button.btn-primary",
			modalBtnDelete: "#editSetModal button.btn-setDelete",
			modalInputName: "#editSetName",
			modalInputDescription: "#editSetDescription",
			modalInputCategory: "#editSetCategory"
		},
		events: {
			"click .newCard": "newCardClicked",
            "click .exportSet": "exportSetClicked",
			"click .editSet": "showEditSetModal",
			"click #editSetModal button.btn-primary": "updateSet",
			"click #editSetModal button.btn-danger": "deleteClicked",
			"click #editSetModal button.btn-warning": "deleteSet",
			"click a.show-rating": "showRatings"
		},
		newCardClicked: function(ev) {
			App.trigger("set:details:new", this.model.get("_id"));
		},
        exportSetClicked:function(ev) {
            $.get('/export/'+this.model.get("id"), function(res){
                var exportString = JSON.stringify(res);
                var blob = new Blob([exportString], {type: "text/plain;charset=utf-8"});
                saveAs(blob, res.info.name +".json");
            });
        },
		showEditSetModal: function() {
			var that = this;

			this.ui.modalInputName.val(_.unescape(this.model.get("name")));
			this.ui.modalInputDescription.val(_.unescape(this.model.get("description")));
			this.ui.modalInputCategory.val(_.unescape(this.model.get("category")));

			if (this.model.get("visibility") === "public") {
					$("#editSetModal .btn-group > label.private").removeClass("active");
					$("#editSetModal .btn-group > label.public").addClass("active");
			}

			if (this.model.get("rating") === false) {
				console.log("RATING");
					$("#editSetModal .btn-group-rating > label.rating-true").removeClass("active");
					$("#editSetModal .btn-group-rating > label.rating-false").addClass("active");
			}

			this.ui.modalView.on('hidden.bs.modal', function() {
				that.ui.modalBtnSave.button('reset');
				that.ui.modalInputName.val('');
				that.ui.modalInputDescription.val('');
				that.$('.help-block').text('');
				that.$('.setdetails').removeClass('has-error');
				that.model.fetch();

			})
			this.ui.modalView.modal('show');
		},
		updateSet: function(ev) {
			var that = this;

			this.ui.modalBtnSave.button('loading');

			var name = _.escape(this.ui.modalInputName.val());
			var description = _.escape(this.ui.modalInputDescription.val());
			var category = _.escape(this.ui.modalInputCategory.val());
			var visibility = _.escape($("#editSetModal .btn-group > label.active > input").val());
			var rating = _.escape($("#editSetModal .btn-group-rating > label.active > input").val());

			this.model.set({
					name: name,
					description: description,
					visibility: visibility,
					category: category,
					cardCnt: 0,
					rating: (rating === 'true')
				 });

			if(this.model.isValid()) {
				this.model.save({},{
				    wait : true,    // waits for server to respond with 200 before adding newly created model to collection
				    success : function(resp){
				        that.ui.modalView.modal('hide');
				    },
				    error : function(err) {
				    	that.ui.modalBtnSave.button('reset');
				        console.log('error callback');
				        // this error message for dev only
				        alert('There was an error. See console for details');
				        console.log(err);
					}
				});
			} else {
				this.showErrors(this.model.validationError);
				this.ui.modalBtnSave.button('reset');
			}
		},
		showErrors: function(errors) {
			console.log("showerrors");
			this.$('.help-block').text('');
			this.$('.setdetails').removeClass('has-error');
		    _.each(errors, function (error) {
		        var cardside = this.$('div.' + error.name);
		        cardside.addClass('has-error');
		        var helptext = this.$('span.' + error.name);
		        helptext.text(error.message);
		    }, this);
		},
		hideErrors: function () {
			console.log("hideerrors");
			this.$('.help-block').text('');
			this.$('.setdetails').removeClass('has-error');
		},
		deleteClicked: function(ev) {
			$(".btn-setDelete").removeClass("btn-danger");
			$(".btn-setDelete").text("Sicher?");
			$(".btn-setDelete").addClass("btn-warning");
		},
		resetDeleteButton: function(ev) {
			if ($(".btn-setDelete").hasClass("btn-warning")) {
					$(".btn-setDelete").removeClass("btn-warning");
					$(".btn-setDelete").addClass("btn-danger");
					$(".btn-setDelete").text("Kartensatz löschen");
			}
		},
		deleteSet: function(ev) {
			var that = this;
			this.ui.modalBtnDelete.button('loading');
			this.model.destroy({

			    success : function(resp){
			        that.ui.modalView.modal('hide');
					that.ui.modalView.on('hidden.bs.modal', function() {
					        App.trigger("set:list");
					})
			    },
			    error : function(err) {
			    	that.ui.modalBtnDelete.button('reset');
			        console.log('error callback');
			        // this error message for dev only
			        alert('There was an error. See console for details');
			        console.log(err);
				}
			});
		},
		showRatings: function(ev) {
			ev.preventDefault();
			App.trigger('set:rating', this.model.get("id"));
		},
		onClose: function(){
			//console.log("asd");
			$(".btn-setDelete").off('clickout');
		},
		onRender: function(){
			console.log(this.$(".btn-setDelete"));
			this.$(".btn-setDelete").clickout(this.resetDeleteButton);
		}
	});
});
