# input fields

calc_lines <- function(label,qr,datefield){
  n_lines = 7
  if (label == "microplate"){
    n_lines <- n_lines - 5
  }else if (label=="cryotube" && qr){
    n_lines <- n_lines - 2

  } else if ((label == "cryotube" | label == "bottle") && datefield){
    n_lines <- n_lines - 1
    print("accessed date field")
  }



  return(n_lines)
  }



label_text <-  function(n_lines){

  line_names = paste("line",1:n_lines,sep="_")

  text_elems <- purrr::map(line_names, ~{
    if (.x == "line_1"){
      output <-  textInput(
        inputId="line_1",
        label="Label Text",
        placeholder = "Enter text...",
        value=""
      )
    }else {
      output <-  textInput(
        inputId= .x ,
        label=NULL,
        placeholder = "Enter text...",
        value=""
      )
    }
    return(output)

  })


  return(text_elems)

}
