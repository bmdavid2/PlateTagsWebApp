
const global label_types= Dict(
    "microplate" => MicroTag,
    "cryotube" => CryoTag, 
    "bottle" => BottleTag
)



function parse_tag(T::Type{MicroTag},qr::Bool,date::Bool,lines::Vector{String}) 

    if length(lines) > 2 
        ArgumentError("cannot execeed two lines with a MicroTag object")
    end 
    qr_code = nothing 
    if qr 
        qr_code = UUIDs.uuid4() |> string |> QRCode 
    end 

    return T(lines[1],lines[2],qr_code;date_field=date)
end 
function parse_tag(T::Type{CryoTag},qr::Bool,date::Bool,lines::Vector{String}) 

    qr_code = nothing 
    if qr 
        qr_code = UUIDs.uuid4() |> string |> QRCode 
    end 

    return T(collect(lines),qr_code;date_field=date)
end 
function parse_tag(T::Type{BottleTag},qr::Bool,date::Bool,lines::Vector{String}) 

        # qr code is automatically included with a bottle tag
        qr_code = UUIDs.uuid4() |> string |> QRCode 

    return T(lines,qr_code;date_field=date)
end 






function single_input(label_type::AbstractString,qr::Bool,date::Bool,n::Integer,lines::Vector{String})

    TagType = label_types[label_type]
    fpath= joinpath(@__DIR__ , "labels.pdf")

    if qr # all tags have unique qr codes, they must be rendered separately
        tmps = AbstractString[]
        for i in 1:n
            tag = parse_tag(TagType,qr,date,lines)
            fname = generate_tags(joinpath(@__DIR__,"tmp$i.pdf"), tag,1) 
            push!(tmps,fname)
        end
        merge_pdfs(tmps,fpath;cleanup=true)
    else # all tags are the same, they can be rendered together 
        tag = parse_tag(TagType,qr,date,lines)
        fpath = generate_tags(fpath,tag,n) 
    end

            


    

    

    return fpath


end 

function csv_input(label_type,data) 

    TagType = label_types[label_type] 
    println(TagType)
    lincols = findall(x->occursin("line",x),names(data))
    filepath= joinpath(@__DIR__ , "labels.pdf")
    lincol_names = sort(names(data)[lincols])
    println(lincol_names)
    i=1
    fnames = String[]
   
    for row in eachrow(data) 
         c = Int64(row.count)
        if row.QR 
            for j in 1:c
                fpath = joinpath(@__DIR__,"tmp$i.pdf")
                lines = Vector{String}(row[lincol_names])
                tag = parse_tag(TagType,row.QR,row.date,lines)
                fpath = generate_tags(fpath,tag,1)
                i+=1
                push!(fnames,fpath)
            end
        else
            fpath = joinpath(@__DIR__,"tmp$i.pdf")
            lines = Vector{String}(row[lincol_names])
            tag = parse_tag(TagType,row.QR,row.date,lines)
            fpath = generate_tags(fpath,tag,c)
            i+=1
            push!(fnames,fpath)
        end

    end 
    merge_pdfs(fnames,filepath,cleanup=true) 
    return filepath 
end 







