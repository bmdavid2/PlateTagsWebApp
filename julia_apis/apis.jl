function generateSingleInput(req::HTTP.Request)

    body = req.body 
    parsed_body = JSON.parse(body) 
    try 
        label_type = parsed_body["label_type"][1]
        qr = parsed_body["qr"][1]
        date = parsed_body["datefield"][1]
        n = parsed_body["n"][1]
        lines = parsed_body["lines"][1]
        lines = Vector{String}(split(lines,","))

        file = single_input(label_type,qr,date,n,lines)

        
            # Read the file content
            body = read(file)

            # Set the correct content type and disposition
            headers = [
                "Content-Type" => "application/pdf",
                # Use "inline" to open in the browser, 
                # Use "attachment" to force a download
                "Content-Disposition" => "attachment; filename=\"labels.pdf\""
            ]

        return HTTP.Response(200,headers,body)
    catch e
        return HTTP.Response(400, "Bad Request in generateSingleInput: $e")
    end
end

function generateMicroplateCSVInput(req::HTTP.Request)
    try 


    df = DataFrame(Tables.dictrowtable(JSON.parse(req.body; null=missing, allownan=true)))
    println("Received DataFrame:")

    file = csv_input("microplate",df)

                # Read the file content
            body = read(file)

            # Set the correct content type and disposition
            headers = [
                "Content-Type" => "application/pdf",
                # Use "inline" to open in the browser, 
                # Use "attachment" to force a download
                "Content-Disposition" => "attachment; filename=\"sample.pdf\""
            ]

        return HTTP.Response(200,headers,body)
    catch e
        return HTTP.Response(400, "Bad Request in generateMicroPlateCSVInput: $e")
    end
end


function generateCryoCSVInput(req::HTTP.Request)
    try 

    df = DataFrame(Tables.dictrowtable(JSON.parse(req.body; null=missing, allownan=true)))
    println("Received DataFrame:")

    file = csv_input("cryotube",df)

                # Read the file content
            body = read(file)

            # Set the correct content type and disposition
            headers = [
                "Content-Type" => "application/pdf",
                # Use "inline" to open in the browser, 
                # Use "attachment" to force a download
                "Content-Disposition" => "attachment; filename=\"sample.pdf\""
            ]

        return HTTP.Response(200,headers,body)
    catch e
        return HTTP.Response(400, "Bad Request in generateCryoCSVInput: $e")
    end
end

function generateBottleCSVInput(req::HTTP.Request)
    try 

    df = DataFrame(Tables.dictrowtable(JSON.parse(req.body; null=missing, allownan=true)))
    println("Received DataFrame:")

    file = csv_input("bottle",df)

                # Read the file content
            body = read(file)

            # Set the correct content type and disposition
            headers = [
                "Content-Type" => "application/pdf",
                # Use "inline" to open in the browser, 
                # Use "attachment" to force a download
                "Content-Disposition" => "attachment; filename=\"sample.pdf\""
            ]

        return HTTP.Response(200,headers,body)
    catch e
        return HTTP.Response(400, "Bad Request in generateBottleCSVInput: $e")
    end
end

