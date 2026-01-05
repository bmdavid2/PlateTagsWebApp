## Panels

label_types <- list(
  "Microplate" = "microplate",
  "Cryotube" = "cryotube",
  "Bottle/Tube" = "bottle"
)



single_input_sidebar <- page_sidebar(
  sidebar=sidebar(
    selectInput(inputId = "label",
                label="Select label type",
                label_types),

    checkboxInput(
      inputId="qr",
      label="Generate QR code",
      value=TRUE),
    checkboxInput(
      inputId="datefield",
      label="Include Date Field",
      value=TRUE
    ),
    uiOutput("dynamic_text_input"),

    numericInput(
      inputId="n_copies",
      label="Number of copies",
      value=1,
      min=1,
      max=100
    ),
    actionButton("generateSingle", "Generate Label(s)")
  )
)

csv_input_sidebar <- page_sidebar(
  sidebar=sidebar(
  selectInput(inputId = "csvlabel",
              label="Select label type",
              label_types),
  downloadButton("downloadtemplate","Download Template"),
  fileInput("csv_upload","Choose a File"),
  actionButton("generateCSV", "Generate Labels")
  )
)
