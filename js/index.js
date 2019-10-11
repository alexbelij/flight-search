$(() => {
  $("#departureDate").datepicker();
  $("#returnDate").datepicker();

  $("#from, #to").autocomplete({
    maxShowItems: 5,
    source: (req, res) => {
      $.ajax({
        "async": true,
        "crossDomain": true,
        "data": `text=${req.term}`,
        "url": 'https://cometari-airportsfinder-v1.p.rapidapi.com/api/airports/by-text',
        "method": "GET",
        "headers": {
          "x-rapidapi-host": "cometari-airportsfinder-v1.p.rapidapi.com",
          "x-rapidapi-key": "9e17e55ef7msh7b448d0f0cae1b2p13d1cfjsn95340acc8e72"
        }
      }).done((data) => res(
        data.map(
          (airport) => ({
            label: `${airport.name} (${airport.code})`,
            value: `${airport.name} (${airport.code})`,
            code: `${airport.code}-sky`
          })
        )
      ));
    },
    select: function (e, ui) {
      $(this).attr('code', ui.item.code);
    }
  });

  $(".minus-button").click(function (e) {
    const $inputElement = $(this).next();
    const value = parseInt($inputElement.val());
    if (value == 0) return;
    $inputElement.val(value - 1);
  });

  $(".plus-button").click(function (e) {
    const $inputElement = $(this).prev();
    const value = parseInt($inputElement.val());
    if (value == 8) return;
    $inputElement.val(value + 1);
  });

  $("#inputForm").submit((e) => {
    e.preventDefault();
    $("#result").empty();
    const [from, to, departureDate, returnDate, cabinClass, adults, children, infant] = e.target.elements;
    const originPlace = $(from)[0].attributes.code.value;
    const destinationPlace = $(to)[0].attributes.code.value;
    const outboundDate = $.datepicker.formatDate("yy-mm-dd", new Date(departureDate.value));
    const inboundDate = $.datepicker.formatDate("yy-mm-dd", new Date(returnDate.value));

    const setting = {
      "async": true,
      "crossDomain": true,
      "url": "https://skyscanner-skyscanner-flight-search-v1.p.rapidapi.com/apiservices/pricing/v1.0",
      "method": "POST",
      "headers": {
        "x-rapidapi-host": "skyscanner-skyscanner-flight-search-v1.p.rapidapi.com",
        "x-rapidapi-key": "9e17e55ef7msh7b448d0f0cae1b2p13d1cfjsn95340acc8e72",
        "content-type": "application/x-www-form-urlencoded"
      },
      "data": {
        inboundDate,
        originPlace,
        destinationPlace,
        outboundDate,
        "cabinClass": "economy",
        "children": "0",
        "infants": "0",
        "country": "US",
        "currency": "USD",
        "locale": "en-US",
        "adults": "1"
      }
    };

    $.ajax(setting).done((response) => {
      console.log(response);
    }).always((data, textStatus, jqXHR) => {
      const sessionkey = jqXHR.getResponseHeader("location").slice(-36);
      const setting = {
        "async": true,
        "crossDomain": true,
        "url": `https://skyscanner-skyscanner-flight-search-v1.p.rapidapi.com/apiservices/pricing/uk2/v1.0/${sessionkey}`,
        "method": "GET",
        "headers": {
          "x-rapidapi-host": "skyscanner-skyscanner-flight-search-v1.p.rapidapi.com",
          "x-rapidapi-key": "9e17e55ef7msh7b448d0f0cae1b2p13d1cfjsn95340acc8e72"
        },
        "data": {
          "sortType": "price",
          "sortOrder": "asc"
        }
      };

      $.ajax(setting).done((response) => {
        console.log(response);
        if (response.Itineraries.length === 0) {
          console.log("no flight")
        } else {
          response.Itineraries.forEach((itinerary) => {
            const minPrice = itinerary.PricingOptions[0].Price;

            const outboundLeg = response.Legs.find((leg) => leg.Id === itinerary.OutboundLegId);
            const outboundInfo = outboundLeg.SegmentIds.map((segmentId) => {
              const segment = response.Segments.find((segment) => segment.Id === segmentId)
              const origin = response.Places.find((place) => place.Id === segment.OriginStation);
              const destination = response.Places.find((place) => place.Id === segment.DestinationStation);
              const carrier = response.Carriers.find((carrier) => carrier.Id === segment.Carrier);
              return ({
                id: segmentId,
                originId: origin.Id,
                originCode: origin.Code,
                originName: origin.Name,
                departureDateTime: segment.DepartureDateTime,
                destinationId: destination.Id,
                destinationCode: destination.Code,
                destinationName: destination.Name,
                arrivalDateTime: segment.ArrivalDateTime,
                carrier
              });
            });

            outboundInfo.sort((a, b) => a.departureDateTime < b.departureDateTime ? -1 : 1);

            const inboundLeg = response.Legs.find((leg) => leg.Id === itinerary.InboundLegId);
            const inboundInfo = inboundLeg.SegmentIds.map((segmentId) => {
              const segment = response.Segments.find((segment) => segment.Id === segmentId)
              const origin = response.Places.find((place) => place.Id === segment.OriginStation);
              const destination = response.Places.find((place) => place.Id === segment.DestinationStation);
              const carrier = response.Carriers.find((carrier) => carrier.Id === segment.Carrier);
              return ({
                id: segmentId,
                originId: origin.Id,
                originCode: origin.Code,
                originName: origin.Name,
                departureDateTime: segment.DepartureDateTime,
                destinationId: destination.Id,
                destinationCode: destination.Code,
                destinationName: destination.Name,
                arrivalDateTime: segment.ArrivalDateTime,
                carrier
              });
            });

            inboundInfo.sort((a, b) => a.departureDateTime < b.departureDateTime ? -1 : 1);

            $("#result").append($("<div></div>").addClass("itinerary"));
            $(".itinerary").last().append($("<div></div>").text(`${minPrice} ${response.Query.Currency}`).addClass("price"));

            $(".itinerary").last().append($("<div></div>").addClass("leg"));
            $(".leg").last().append($("<div></div>").text("Outbound").addClass("directionality"));
            $(".leg").last().append($("<div></div>").addClass("leg-content"));

            for (let i = 0; i < outboundInfo.length; i++) {
              $(".leg-content").last().append(
                $("<div></div>")
                  .text(`
                    ${outboundInfo[i].carrier.Name} 
                    ${outboundInfo[i].departureDateTime} ${outboundInfo[i].originCode} ⇒ 
                    ${outboundInfo[i].arrivalDateTime} ${outboundInfo[i].destinationCode} 
                  `).addClass("segment"));
            }

            $(".itinerary").last().append($("<div></div>").addClass("leg"));
            $(".leg").last().append($("<div></div>").text("Inbound").addClass("directionality"));
            $(".leg").last().append($("<div></div>").addClass("leg-content"));

            for (let i = 0; i < inboundInfo.length; i++) {
              $(".leg-content").last().append(
                $("<div></div>")
                  .text(`
                    ${inboundInfo[i].carrier.Name} 
                    ${inboundInfo[i].departureDateTime} ${inboundInfo[i].originCode} ⇒ 
                    ${inboundInfo[i].arrivalDateTime} ${inboundInfo[i].destinationCode} 
                  `).addClass("segment"));
            }
          });
        }
      });
    });
  });
});