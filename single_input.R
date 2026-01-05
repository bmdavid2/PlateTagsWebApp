# Single input pages


single_input_sidebar <- page_sidebar(
  title="Label Information",
  sidebar=sidebar(

    uiOutput("dynamic_text_input"),

    checkboxInput(
      inputId="qr",
      label="Generate QR code",
      value=FALSE),
    checkboxInput(
      inputId="datefield",
      label="Include Date Field",
      value=TRUE
    ),
    numericInput(
      inputId="n_copies",
      label="Number of copies",
      value=1,
      min=1,
      max=100
    ),
    actionButton("generate", "Generate Label(s)")
  )
)
