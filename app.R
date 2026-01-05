library(shiny)
library(bslib)
library(httr)
library(jsonlite)
source("panels.R")
source("input_fields.R")

# Define UI for app that draws a histogram ----
ui <- page_navbar(
  # source pages


  # App title ----
  title="PlateTags",
  collapsible= FALSE,
  position= "static-top",
  fluid = TRUE,
  underline= FALSE,
  navset_pill(
    nav_panel("Single Input",single_input_sidebar,
              downloadButton("labelPDF","Download Labels")),
    nav_panel("CSV Input",csv_input_sidebar,
              downloadButton("labelPDFCSV","Download Labels"))
  )

)

# Define server logic required to draw a histogram ----
server <- function(input, output) {

    pdf_raw_data <- reactiveVal(NULL)
    output$dynamic_text_input <- renderUI({tagList(label_text(calc_lines(input$label,input$qr,input$datefield)))})




    observeEvent(input$generateSingle,{
                output$labelPDF <- NULL
                print("activated button")
                inp <- reactiveValuesToList(input)
                n <- calc_lines(input$label,input$qr,input$datefield)
                lines <- inp[which(grepl("line",names(inp)))]
                print(lines)
                r_dict <- list(
                  label_type = inp$label,
                  qr = inp$qr ,
                  datefield = inp$datefield,
                  lines = paste(lines[1:n],collapse=",") ,
                  n = inp$n
                )

                input_json  = jsonlite::toJSON(r_dict,pretty=TRUE)
                 response <- httr::POST("http://0.0.0.0:8080/generateSingleInput",
                            body = input_json)

                 pdf_raw_data(httr::content(response, "raw"))
                 if (httr::status_code(response) == 200) {
                   # Process success
                   output$labelPDF <- downloadHandler(
                     filename = function() {
                       "labels.pdf"
                     },
                     content = function(file) {
                       req(pdf_raw_data()) # Ensure data is available

                       # Write the raw data (binary) to the output file path
                       writeBin(pdf_raw_data(), con = file)
                     },
                     contentType = "application/pdf"
                   )
                   print("POST request successful")
                 } else {
                   # Handle error
                   print(paste("POST request failed with status:", httr::status_code(response),response))
                 }
                 print("finished button")

                   }

                 )


    observeEvent(input$generateCSV, {
      file <- input$csv_upload
      data = read.csv(file$datapath)
      my_data = data[ ,1:10]
      print(names(my_data))
      input_json <- toJSON(my_data, pretty = TRUE, auto_unbox = TRUE)

      label_type = input$csvlabel
      print(label_type)
      reqs <- list(
        microplate = "http://0.0.0.0:8080/generateMicroplateCSVInput",
        cryotube = "http://0.0.0.0:8080/generateCryoCSVInput",
        bottle = "http://0.0.0.0:8080/generateBottleCSVInput"
      )
      req = reqs[label_type][[1]]
      response <- httr::POST(req,
                             body = input_json)

      pdf_raw_data(httr::content(response, "raw"))
      if (httr::status_code(response) == 200) {
        # Process success
        output$labelPDFCSV <- downloadHandler(
          filename = function() {
            "labels.pdf"
          },
          content = function(file) {
            req(pdf_raw_data()) # Ensure data is available

            # Write the raw data (binary) to the output file path
            writeBin(pdf_raw_data(), con = file)
          },
          contentType = "application/pdf"
        )
        print("POST request successful")
      } else {
        # Handle error
        print(paste("POST request failed with status:", httr::status_code(response),response))
      }
      print("finished button")

    })

    output$downloadtemplate <- downloadHandler("template.csv",
                                               content = function(file) {
                                                 # Path to the actual file on your server (e.g., in a 'data' folder)
                                                 # Ensure this path is correct relative to your app's directory
                                                 existing_file_path <- file.path("data", "plate_tags_template.csv")

                                                 # Copy the existing file to the temporary 'file' path provided by Shiny
                                                 file.copy(existing_file_path, file)
                                                 }
    )




}

shinyApp(ui = ui, server = server)
