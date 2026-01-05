using HTTP, DataFrames, PlateTags, CSV, PDFmerger, JSON, Plots, UUIDs,QRCoders
include("./generate_tags.jl")
include("./julia_apis/inputs.jl")
include("./julia_apis/apis.jl")



function add_cors_headers(response::HTTP.Response)
    HTTP.setheader(response, "Access-Control-Allow-Origin" => "*")
    HTTP.setheader(response, "Access-Control-Allow-Methods" => "GET, POST, OPTIONS")
    HTTP.setheader(response, "Access-Control-Allow-Headers" => "Content-Type")
    return response
end

# Create a dictionary mapping endpoints to functions
api_handlers = Dict(
    "/generateSingleInput" => generateSingleInput,
    "/generateMicroplateCSVInput" => generateMicroplateCSVInput,
    "/generateCryoCSVInput" => generateCryoCSVInput,
    "/generateBottleCSVInput" => generateBottleCSVInput
)

function handle_request(req::HTTP.Request)
    if req.method == "OPTIONS"
        response = HTTP.Response(200)
        return add_cors_headers(response)
    elseif req.method == "GET"
        endpoint_and_params = split(req.target, '/')[2:end]
        endpoint = "/" * join(endpoint_and_params[1])

        # Check if the endpoint exists in the API handlers
        if haskey(api_handlers, endpoint)
            # Get parameters and filter out empty strings
            params = filter(x -> !isempty(x), String.(endpoint_and_params[2:end]))

            try
                if isempty(params) # if no parameters in api call
                    response = api_handlers[endpoint]()
                else
                    response = api_handlers[endpoint](params...)
                end
            catch e
                response = HTTP.Response(400, "Error calling API handler: $e")
            end
        else
            response = HTTP.Response(404, "Not Found: No handler for $endpoint")
        end
        return add_cors_headers(response)
    elseif req.method == "POST"
        endpoint = req.target

        if haskey(api_handlers, endpoint)
            try
    
                # Call the corresponding function with the parsed body
                response = api_handlers[endpoint](req)
            catch e
                response = HTTP.Response(400, "Bad Request: $e")
            end
        else
            response = HTTP.Response(404, "Not Found: No handler for $endpoint")
        end
        return add_cors_headers(response)
    else
        response = HTTP.Response(404, "Not Found")
        return add_cors_headers(response)
    end
end

# run the server
println("Server running...")

HTTP.serve(handle_request, "0.0.0.0", 8080)