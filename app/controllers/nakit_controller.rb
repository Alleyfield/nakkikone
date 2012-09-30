class NakitController < ApplicationController

  def index
    current_party = Party.find(params[:party_id])
    nakkilist = []
    current_party.nakkitypes.each{ |t| nakkilist += t.nakkis }

    render :json => nakkilist
  end

  def update
    nakki = Nakki.find(params[:id])
    nakki.user = User.find(params[:assign])

    if nakki.save
      render :json => nakki
    else
      render :text => "waht waht"
    end
  end
end
